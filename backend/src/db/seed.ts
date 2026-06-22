import { db } from '../config/database';
import { users, userProfiles } from './schema/users';
import { subscriptionPlans } from './schema/subscriptions';
import { badges } from './schema/progress';
import { faqs } from './schema/support';
import { hashPassword } from '../lib/hash';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('[Seed] Seeding database...');

  // 1. Seed Subscription Plans
  console.log('[Seed] Seeding subscription plans...');
  
  const basicValues = {
    name: 'Basic Learner',
    price: 0,
    features: ['Akses modul dasar', '50 pesan AI per hari', 'Kuis interaktif'],
    aiLimit: 50,
  };

  const proValues = {
    name: 'Pro Learner',
    price: 99000,
    features: ['Semua akses modul pembelajaran', 'Pesan AI Tanpa Batas', 'Sertifikat kelulusan digital', 'Eksekusi kode Python sandbox'],
    aiLimit: -1,
  };

  // Select first or insert
  let basicPlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.name, basicValues.name)
  });

  if (!basicPlan) {
    const [inserted] = await db.insert(subscriptionPlans).values(basicValues).returning();
    basicPlan = inserted;
    console.log('[Seed] Basic Learner plan created');
  } else {
    console.log('[Seed] Basic Learner plan already exists');
  }

  let proPlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.name, proValues.name)
  });

  if (!proPlan) {
    await db.insert(subscriptionPlans).values(proValues);
    console.log('[Seed] Pro Learner plan created');
  } else {
    console.log('[Seed] Pro Learner plan already exists');
  }

  // 1.5 Seed Badges
  console.log('[Seed] Seeding badges...');
  const badgesList = [
    {
      name: 'Langkah Pertama',
      description: 'Menyelesaikan pelajaran pertama Anda',
      iconUrl: '/assets/badges/first-step.svg',
      criteriaType: 'streak',
      criteriaValue: 1,
    },
    {
      name: 'Konsisten Awal',
      description: 'Mencapai streak belajar 3 hari berturut-turut',
      iconUrl: '/assets/badges/streak-3.svg',
      criteriaType: 'streak',
      criteriaValue: 3,
    },
    {
      name: 'Kuis Sempurna',
      description: 'Mendapatkan nilai 100% pada kuis pertama Anda',
      iconUrl: '/assets/badges/quiz-perfect.svg',
      criteriaType: 'quiz_perfect',
      criteriaValue: 1,
    },
    {
      name: 'Wisudawan AIphy',
      description: 'Menyelesaikan seluruh modul dalam satu kelas',
      iconUrl: '/assets/badges/course-complete.svg',
      criteriaType: 'course_complete',
      criteriaValue: 1,
    },
  ];

  for (const badgeValues of badgesList) {
    const existingBadge = await db.query.badges.findFirst({
      where: eq(badges.name, badgeValues.name),
    });

    if (!existingBadge) {
      await db.insert(badges).values(badgeValues);
      console.log(`[Seed] Badge '${badgeValues.name}' created`);
    } else {
      console.log(`[Seed] Badge '${badgeValues.name}' already exists`);
    }
  }

  // 2. Seed Default Admin
  console.log('[Seed] Seeding super admin...');
  const adminEmail = 'admin@aiphy.ug.ac.id';
  const hashed = await hashPassword('adminpassword');

  // Find or create admin
  const adminUsers = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (adminUsers.length === 0) {
    const [admin] = await db.insert(users).values({
      name: 'Super Admin',
      email: adminEmail,
      passwordHash: hashed,
      role: 'super_admin',
      status: 'active',
    }).returning();

    await db.insert(userProfiles).values({
      userId: admin.id,
      bio: 'Sistem Administrator AIphy',
      skillLevel: 'advanced',
      notificationEnabled: true,
      darkMode: true,
    });

    console.log('[Seed] Super admin created: admin@aiphy.ug.ac.id / adminpassword');
  } else {
    console.log('[Seed] Super admin already exists');
  }

  // 3. Seed FAQs
  console.log('[Seed] Seeding FAQs...');
  const faqsList = [
    {
      question: 'Apa itu AIphy?',
      answer: 'AIphy adalah platform pembelajaran kecerdasan buatan (AI) adaptif berbasis Generative AI yang dirancang khusus untuk membantu pemula memahami konsep AI dengan bahasa yang sederhana dan interaktif.',
      category: 'general',
      order: 1,
    },
    {
      question: 'Apakah AIphy gratis?',
      answer: 'Ya, Anda bisa menggunakan akun Basic Learner secara gratis. Paket gratis ini mencakup akses modul dasar dan 50 pesan AI per hari dengan asisten virtual kami.',
      category: 'general',
      order: 2,
    },
    {
      question: 'Bagaimana cara berlangganan Pro Learner?',
      answer: 'Anda dapat masuk ke dashboard, membuka halaman pengaturan atau pricing, lalu menekan tombol beli paket Pro. Pembayaran dapat disimulasikan menggunakan gerbang pembayaran sandbox Xendit.',
      category: 'payment',
      order: 1,
    },
    {
      question: 'Apa saja kelebihan Pro Learner?',
      answer: 'Pengguna Pro Learner mendapatkan akses ke seluruh modul kurikulum tingkat menengah/lanjut, pesan AI tanpa batas harian, sertifikat kelulusan digital, dan kemampuan eksekusi kode Python langsung di dalam sandbox terisolasi.',
      category: 'general',
      order: 3,
    },
  ];

  for (const faqValues of faqsList) {
    const existingFaq = await db.query.faqs.findFirst({
      where: eq(faqs.question, faqValues.question),
    });

    if (!existingFaq) {
      await db.insert(faqs).values(faqValues);
      console.log(`[Seed] FAQ '${faqValues.question}' created`);
    } else {
      console.log(`[Seed] FAQ '${faqValues.question}' already exists`);
    }
  }

  console.log('[Seed] Seeding completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed] Error seeding database:', err);
  process.exit(1);
});
