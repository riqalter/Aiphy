import { db } from '../../config/database';
import { cartItems, courses, courseEnrollments } from '../../db/schema/courses';
import { users } from '../../db/schema/users';
import { eq, and, inArray } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { env } from '../../config/env';
import { redis } from '../../config/redis';

export class CartService {
  // Get all cart items for a user
  static async getCart(userId: string) {
    const items = await db
      .select({
        id: cartItems.id,
        addedAt: cartItems.addedAt,
        course: {
          id: courses.id,
          title: courses.title,
          price: courses.price,
          originalPrice: courses.originalPrice,
          thumbnailUrl: courses.thumbnailUrl,
          category: courses.category,
        },
      })
      .from(cartItems)
      .innerJoin(courses, eq(cartItems.courseId, courses.id))
      .where(eq(cartItems.userId, userId));

    return items;
  }

  // Add course to cart
  static async addToCart(userId: string, courseId: string) {
    // 1. Verify course exists and is published
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.isPublished, true)))
      .limit(1);

    if (!course) {
      throw new NotFoundError('Course not found or not published');
    }

    if (course.price === 0) {
      throw new BadRequestError('This is a free course. You can enroll directly.');
    }

    // 2. Verify not already enrolled
    const [enrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)))
      .limit(1);

    if (enrollment) {
      throw new BadRequestError('You are already enrolled in this course.');
    }

    // 3. Verify not already in cart
    const [existingCartItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.courseId, courseId)))
      .limit(1);

    if (existingCartItem) {
      return existingCartItem;
    }

    const [item] = await db
      .insert(cartItems)
      .values({
        userId,
        courseId,
      })
      .returning();

    return item;
  }

  // Remove from cart
  static async removeFromCart(userId: string, itemId: string) {
    const [deleted] = await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Cart item not found');
    }

    return { success: true, message: 'Item removed from cart' };
  }

  // Checkout (create Xendit invoice)
  static async checkout(userId: string) {
    const cart = await this.getCart(userId);
    if (cart.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Calculate total price
    const totalAmount = cart.reduce((sum, item) => sum + item.course.price, 0);
    const courseIds = cart.map(item => item.course.id);
    const courseTitles = cart.map(item => item.course.title).join(', ');

    // Generate unique transaction reference
    const transactionId = crypto.randomUUID();

    // Store transaction metadata in Redis (TTL 7 days)
    const txMetadata = {
      userId,
      courseIds,
      amount: totalAmount,
    };
    await redis.set(`pending_payment:${transactionId}`, JSON.stringify(txMetadata), 'EX', 7 * 86400);

    // Call Xendit API using direct fetch with sandbox authentication
    // Xendit uses Basic Auth: base64(SECRET_KEY + ':')
    const xenditAuth = btoa(`${env.XENDIT_SECRET_KEY}:`);

    // In sandbox, if key is not configured, simulate success link
    if (!env.XENDIT_SECRET_KEY) {
      console.log('====== XENDIT DEV MODE (KEY NOT CONFIGURED) ======');
      console.log(`Simulating payment for Transaction: ${transactionId}`);
      console.log(`Amount: ${totalAmount} IDR`);
      console.log(`User: ${user.email}`);
      console.log('==================================================');

      const simPaymentUrl = `${env.FRONTEND_URL}/payment-simulation?id=${transactionId}&amount=${totalAmount}`;
      return {
        invoiceUrl: simPaymentUrl,
        externalId: transactionId,
        simulated: true,
      };
    }

    try {
      const response = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${xenditAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_id: transactionId,
          amount: totalAmount,
          payer_email: user.email,
          description: `AIphy Course Purchase: ${courseTitles}`,
          success_redirect_url: `${env.FRONTEND_URL}/dashboard?status=success`,
          failure_redirect_url: `${env.FRONTEND_URL}/dashboard?status=failed`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Xendit API Error]', errorText);
        throw new BadRequestError('Failed to create payment invoice with Xendit');
      }

      const invoice = await response.json();
      return {
        invoiceUrl: invoice.invoice_url,
        externalId: transactionId,
        simulated: false,
      };
    } catch (err: any) {
      console.error('[Checkout Error]', err);
      throw err;
    }
  }

  // Handle Xendit Webhook Callback
  static async handleWebhook(body: any, signatureHeader?: string) {
    // In production, verify Xendit webhook signature:
    // const xWebhookToken = signatureHeader;
    // if (xWebhookToken !== env.XENDIT_WEBHOOK_TOKEN) throw new ForbiddenError('Invalid webhook token');

    const externalId = body.external_id;
    const status = body.status;

    if (!externalId) {
      throw new BadRequestError('Webhook missing external_id');
    }

    // Only process successful payments
    if (status !== 'PAID' && body.status !== 'PAID') {
      return { success: true, message: 'Non-PAID event ignored' };
    }

    // Fetch transaction metadata from Redis
    const redisKey = `pending_payment:${externalId}`;
    const txDataStr = await redis.get(redisKey);
    if (!txDataStr) {
      // Might have been processed already
      return { success: true, message: 'Transaction already processed or expired' };
    }

    const txData = JSON.parse(txDataStr);

    // Enroll user in courses using a database transaction
    await db.transaction(async (tx) => {
      // 1. Enroll user in each course
      for (const courseId of txData.courseIds) {
        // Double check not already enrolled
        const [existing] = await tx
          .select()
          .from(courseEnrollments)
          .where(and(eq(courseEnrollments.userId, txData.userId), eq(courseEnrollments.courseId, courseId)))
          .limit(1);

        if (!existing) {
          await tx.insert(courseEnrollments).values({
            userId: txData.userId,
            courseId: courseId,
            status: 'active',
          });
        }
      }

      // 2. Clear cart items for these courses
      await tx
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.userId, txData.userId),
            inArray(cartItems.courseId, txData.courseIds)
          )
        );
    });

    // Delete pending transaction from Redis
    await redis.del(redisKey);

    return { success: true, message: 'User enrolled and cart cleared successfully' };
  }
}
