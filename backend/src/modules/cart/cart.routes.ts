import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { CartService } from './cart.service';

export const cartRoutes = new Elysia()
  // --- Public Payment Webhook ---
  .post(
    '/api/payment/webhook',
    async ({ body, headers }) => {
      const signature = headers['x-callback-token'] || undefined;
      return await CartService.handleWebhook(body, signature);
    },
    {
      body: t.Object({
        external_id: t.String(),
        status: t.String(),
        amount: t.Optional(t.Integer()),
        payer_email: t.Optional(t.String()),
      }),
    }
  )

  // --- Sandbox Simulation Helper (For development local testing) ---
  .post(
    '/api/payment/simulate-success',
    async ({ body }) => {
      // Direct call webhook handler with PAID status
      const fakeWebhookPayload = {
        external_id: body.transactionId,
        status: 'PAID',
      };
      
      const result = await CartService.handleWebhook(fakeWebhookPayload);
      return {
        success: true,
        message: 'Payment simulation succeeded',
        detail: result,
      };
    },
    {
      body: t.Object({
        transactionId: t.String(),
      }),
    }
  )

  // --- Auth Protected Cart Routes ---
  .use(requireAuth)
  
  .get('/api/cart', async ({ user }) => {
    const items = await CartService.getCart(user!.id);
    return {
      success: true,
      data: items,
    };
  })

  .post(
    '/api/cart/add',
    async ({ user, body }) => {
      const item = await CartService.addToCart(user!.id, body.courseId);
      return {
        success: true,
        message: 'Course added to cart successfully',
        data: item,
      };
    },
    {
      body: t.Object({
        courseId: t.String(),
      }),
    }
  )

  .delete(
    '/api/cart/:id',
    async ({ user, params }) => {
      const result = await CartService.removeFromCart(user!.id, params.id);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  .post('/api/cart/checkout', async ({ user }) => {
    const result = await CartService.checkout(user!.id);
    return {
      success: true,
      message: 'Checkout invoice created successfully',
      data: result,
    };
  });
