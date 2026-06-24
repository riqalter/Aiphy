import { db } from '../../config/database';
import { chatConversations, chatMessages, aiTokenUsage, aiPromptTemplates } from '../../db/schema/ai';
import { courses, modules, lessons } from '../../db/schema/courses';
import { users } from '../../db/schema/users';
import { userSubscriptions, subscriptionPlans } from '../../db/schema/subscriptions';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../lib/errors';
import { llmClient, DEFAULT_MODEL } from './llm-client';
import { redis } from '../../config/redis';
import { env } from '../../config/env';

export class AIService {
  // --- RATE LIMITING ---

  static async checkRateLimit(userId: string) {
    // 1. Get user subscription plan to check AI limit
    const [sub] = await db
      .select({
        aiLimit: subscriptionPlans.aiLimit,
        planName: subscriptionPlans.name,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);

    const limit = sub?.aiLimit ?? 50; // default 50 for free basic tier
    if (limit === -1) {
      // Pro/Unlimited tier
      return { limited: false, count: 0, limit };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const redisKey = `rate_limit:ai:${userId}:${todayStr}`;

    // Connect if needed
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
    }

    const currentCount = await redis.incr(redisKey);
    if (currentCount === 1) {
      await redis.expire(redisKey, 86400); // 24h expiration
    }

    if (currentCount > limit) {
      throw new ForbiddenError(`Batas pesan harian AI Anda (${limit} pesan) telah habis. Silakan tingkatkan ke Pro Learner untuk akses tanpa batas.`);
    }

    return { limited: true, count: currentCount, limit };
  }

  // --- CONVERSATION CRUD ---

  static async createConversation(userId: string, data: { courseId?: string; title: string }) {
    const [conv] = await db
      .insert(chatConversations)
      .values({
        userId,
        courseId: data.courseId || null,
        title: data.title,
      })
      .returning();

    return conv;
  }

  static async getConversations(userId: string) {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.createdAt));
  }

  static async getHistory(conversationId: string, limit = 50) {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);
  }

  static async deleteConversation(userId: string, conversationId: string) {
    const [conv] = await db
      .select()
      .from(chatConversations)
      .where(and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId)))
      .limit(1);

    if (!conv) {
      throw new NotFoundError('Conversation not found');
    }

    await db
      .delete(chatConversations)
      .where(eq(chatConversations.id, conversationId));

    return { success: true, message: 'Conversation deleted successfully' };
  }

  // --- AI MESSAGE CHAT STREAMING ---

  static async sendMessageStream(userId: string, conversationId: string, userMessage: string, lessonId?: string) {
    // 1. Check rate limits
    await this.checkRateLimit(userId);

    // 2. Fetch conversation details to verify ownership and check context
    const [conv] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conv || conv.userId !== userId) {
      throw new NotFoundError('Conversation not found');
    }

    // 3. Save User message to DB
    const [savedUserMsg] = await db
      .insert(chatMessages)
      .values({
        conversationId,
        role: 'user',
        content: userMessage,
      })
      .returning();

    // 4. Build Context-Aware System Prompt
    let activeModel = DEFAULT_MODEL;
    let activeTemperature = 0.7;
    let activeMaxTokens = 2048;
    let systemPrompt = 
      "Anda adalah AIphy Tutor, asisten pembelajaran kecerdasan buatan adaptif yang cerdas, ramah, dan interaktif untuk pemula di Indonesia. " +
      "Tugas utama Anda adalah menjelaskan materi secara interaktif, menyederhanakan bahasa teknis yang kompleks menjadi mudah dimengerti, " +
      "dan memberikan analogi yang relevan di kehidupan sehari-hari.\n\n";

    try {
      if (redis.status !== 'ready' && redis.status !== 'connecting') {
        await redis.connect();
      }
      const configStr = await redis.get('ai_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        activeModel = config.model || activeModel;
        activeTemperature = config.temperature !== undefined ? config.temperature : activeTemperature;
        activeMaxTokens = config.maxTokens !== undefined ? config.maxTokens : activeMaxTokens;
        if (config.systemPrompt) {
          systemPrompt = config.systemPrompt.trim() + "\n\n";
        }
      }
    } catch (err) {
      console.error('[AI Config Load Error]', err);
    }

    if (conv.courseId) {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, conv.courseId),
        with: {
          modules: {
            with: {
              lessons: {
                columns: {
                  id: true,
                  title: true,
                  type: true,
                  duration: true,
                  contentBody: true,
                }
              }
            }
          }
        }
      });

      if (course) {
        systemPrompt += `Siswa saat ini sedang mempelajari kursus: "${course.title}" (${course.description}).\n`;
        systemPrompt += "Berikut adalah silabus lengkap dan rangkuman materi dari kursus tersebut untuk membantu Anda menjawab pertanyaan dengan sangat kontekstual:\n";
        
        for (const mod of course.modules) {
          systemPrompt += `- Modul: ${mod.title} (${mod.description || ''})\n`;
          for (const les of mod.lessons) {
            systemPrompt += `  * Pelajaran: ${les.title} (Durasi: ${les.duration} menit)\n`;
          }
        }

        // Check if there is an active lesson context
        let activeLesson = null;
        if (lessonId) {
          for (const mod of course.modules) {
            const found = mod.lessons.find(l => l.id === lessonId);
            if (found) {
              activeLesson = found;
              break;
            }
          }
        }

        if (activeLesson) {
          systemPrompt += `\nSaat ini, siswa sedang membuka materi pelajaran: "${activeLesson.title}" (${activeLesson.type}).\n`;
          systemPrompt += `Berikut adalah isi konten lengkap dari materi pelajaran tersebut:\n`;
          systemPrompt += `"""\n${activeLesson.contentBody || 'Konten kosong.'}\n"""\n`;
          systemPrompt += `Fokuskan penjelasan Anda terutama untuk membantu siswa memahami materi pelajaran yang sedang dibukanya ini.\n`;
        } else {
          // Fallback summary list
          systemPrompt += "\nBerikut adalah ringkasan isi konten materi pelajaran kursus ini:\n";
          for (const mod of course.modules) {
            for (const les of mod.lessons) {
              if (les.contentBody) {
                systemPrompt += `- Pelajaran "${les.title}": ${les.contentBody.substring(0, 150)}...\n`;
              }
            }
          }
        }
        
        systemPrompt += "\nGunakan konteks kurikulum di atas untuk memberikan jawaban bimbingan belajar yang sinkron dan relevan dengan materi kelas mereka.";
      }
    } else {
      // General AI Chat Context (Global Chat)
      try {
        const activeCourses = await db
          .select({
            id: courses.id,
            title: courses.title,
            category: courses.category,
            level: courses.level,
            description: courses.description,
            price: courses.price,
          })
          .from(courses)
          .where(eq(courses.isPublished, true));

        if (activeCourses && activeCourses.length > 0) {
          systemPrompt += "Berikut adalah daftar kelas/kursus yang saat ini tersedia dan aktif di platform pembelajaran AIphy:\n";
          for (const course of activeCourses) {
            const priceText = course.price === 0 ? "Gratis" : `Rp ${course.price.toLocaleString('id-ID')}`;
            systemPrompt += `- **${course.title}** (Kategori: ${course.category}, Tingkat: ${course.level}, Harga: ${priceText})\n`;
            systemPrompt += `  Deskripsi: ${course.description}\n`;
            systemPrompt += `  Link Kursus: /courses/${course.id}\n\n`;
          }
          systemPrompt += "Gunakan daftar di atas untuk menjawab pertanyaan siswa mengenai kursus apa saja yang tersedia, rekomendasi belajar, deskripsi kursus, atau tautan akses menuju kursus tersebut.\n";
          systemPrompt += "Selalu sarankan siswa untuk mengklik tautan kursus /courses/[id-kursus] jika mereka tertarik untuk mendaftar atau belajar kelas tersebut.";
        } else {
          systemPrompt += "Saat ini belum ada kursus yang diterbitkan secara aktif di platform AIphy.\n";
        }
      } catch (err) {
        console.error('[AI General Courses Load Error]', err);
      }
    }

    // 5. Retrieve recent chat history
    const history = await this.getHistory(conversationId, 10);
    const messagesPayload: any[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of history) {
      // Don't include the current user message yet, we append it manually
      if (msg.id !== savedUserMsg.id) {
        messagesPayload.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Append current message
    messagesPayload.push({ role: 'user', content: userMessage });

    // 6. Handle streaming via ReadableStream
    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullResponseText = '';
        let promptTokens = 0;
        let completionTokens = 0;

        try {
          if (!env.LLM_API_KEY) {
            // Simulated response in dev mode
            const mockWords = `[Simulated LLM] Terima kasih atas pertanyaan Anda tentang "${userMessage.substring(0, 20)}". Sebagai tutor AIphy, saya senang membantu Anda belajar! Pembelajaran adaptif membantu Anda memahami materi tingkat kesulitan beginner dengan bahasa yang mudah.`.split(' ');
            
            for (const word of mockWords) {
              const chunk = `data: ${JSON.stringify({ text: word + ' ' })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
              fullResponseText += word + ' ';
              await new Promise(r => setTimeout(r, 80));
            }
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            
            // Save mock response
            await db.insert(chatMessages).values({
              conversationId,
              role: 'assistant',
              content: fullResponseText,
              tokensUsed: mockWords.length,
            });
            controller.close();
            return;
          }

          // Call actual OpenAI SDK in stream mode
          const stream = await llmClient.chat.completions.create({
            model: activeModel,
            messages: messagesPayload,
            stream: true,
            temperature: activeTemperature,
            max_tokens: activeMaxTokens,
            stream_options: { include_usage: true },
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            
            // Track tokens usage if provided by stream_options
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens;
              completionTokens = chunk.usage.completion_tokens;
            }

            if (content) {
              fullResponseText += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
            }
          }

          // Close Stream signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Save assistant message to DB
          await db.insert(chatMessages).values({
            conversationId,
            role: 'assistant',
            content: fullResponseText,
            tokensUsed: promptTokens + completionTokens || Math.round(fullResponseText.length / 4),
          });

          // Log Token Usage for billing/analytics
          if (promptTokens > 0) {
            // pricing approximation: $0.150 / 1M input tokens, $0.600 / 1M output tokens (GPT-4o-mini rates)
            const cost = (promptTokens * 0.00000015) + (completionTokens * 0.0000006);
            await db.insert(aiTokenUsage).values({
              userId,
              model: activeModel,
              promptTokens,
              completionTokens,
              estimatedCost: cost.toFixed(6),
            });
          }

          controller.close();
        } catch (err: any) {
          console.error('[AI Chat Stream Error]', err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
          controller.close();
        }
      },
    });
  }

  // --- ADMIN AI outline GENERATOR ---

  static async generateOutline(topic: string) {
    if (!topic || topic.trim().length === 0) {
      throw new BadRequestError('Topic is required');
    }

    const systemPrompt = 
      "Anda adalah asisten kurikulum AI profesional. Buat rancangan materi silabus kurikulum kursus yang terstruktur mengenai topik yang diminta.\n" +
      "Kembalikan respon Anda eksklusif dalam bentuk JSON ARRAY dengan struktur objek sebagai berikut (TANPA markdown wrapper, TANPA text penjelas, hanya raw JSON):\n" +
      `[\n` +
      `  {\n` +
      `    "moduleTitle": "Judul Modul 1",\n` +
      `    "moduleDescription": "Penjelasan singkat modul",\n` +
      `    "lessons": [\n` +
      `      { "title": "Judul Pelajaran 1", "type": "text", "duration": 10, "contentBody": "Penjelasan Markdown isi pelajaran..." },\n` +
      `      { "title": "Judul Pelajaran 2", "type": "coding", "duration": 15, "contentBody": "Petunjuk tugas pemograman Python..." },\n` +
      `      { "title": "Judul Kuis Modul 1", "type": "quiz", "duration": 5 }\n` +
      `    ]\n` +
      `  }\n` +
      `]`;

    try {
      if (!env.LLM_API_KEY) {
        // Simulated output
        return [
          {
            moduleTitle: `Modul 1: Pengenalan ${topic}`,
            moduleDescription: `Dasar-dasar utama mengenai pembelajaran ${topic} bagi pemula.`,
            lessons: [
              { title: `Apa itu ${topic}?`, type: 'text', duration: 10, contentBody: `### Pengenalan\n${topic} adalah bidang yang sangat menarik...` },
              { title: 'Latihan Kode Pertama', type: 'coding', duration: 15, contentBody: 'print("Halo Dunia")' },
              { title: 'Evaluasi Modul 1', type: 'quiz', duration: 5 },
            ],
          },
        ];
      }

      let activeModel = DEFAULT_MODEL;
      try {
        if (redis.status !== 'ready' && redis.status !== 'connecting') {
          await redis.connect();
        }
        const configStr = await redis.get('ai_config');
        if (configStr) {
          const config = JSON.parse(configStr);
          activeModel = config.model || activeModel;
        }
      } catch (err) {
        console.error('[AI Outline Config Load Error]', err);
      }

      const response = await llmClient.chat.completions.create({
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Buatkan silabus untuk topik: ${topic}` },
        ],
        temperature: 0.7,
      });

      const responseText = response.choices[0]?.message?.content || '';
      
      // Attempt to clean markdown block formatting if LLM returned it anyway
      const cleanedJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleanedJson);
    } catch (err: any) {
      console.error('[GenerateOutline Error]', err);
      throw new BadRequestError(`Failed to generate outline via AI: ${err.message}`);
    }
  }
}
