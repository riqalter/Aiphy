import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { HelpService } from './help.service';

export const helpRoutes = new Elysia()
  // 1. Get FAQs (public)
  .get('/api/help/faqs', async () => {
    const list = await HelpService.getFAQs();
    return {
      success: true,
      data: list,
    };
  })

  // 2. Submit B2B Partnership Inquiry Form (public - landing page)
  .post(
    '/api/contact',
    async ({ body }) => {
      const inquiry = await HelpService.createPartnershipInquiry(body);
      return {
        success: true,
        message: 'Partnership inquiry submitted successfully',
        data: inquiry,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        message: t.String({ minLength: 10 }),
      }),
    }
  )

  // 3. Create Support Ticket (auth protected)
  .use(requireAuth)
  .post(
    '/api/help/tickets',
    async ({ user, body }) => {
      const ticket = await HelpService.createTicket(user!.id, body);
      return {
        success: true,
        message: 'Support ticket submitted successfully',
        data: ticket,
      };
    },
    {
      body: t.Object({
        subject: t.String({ minLength: 5 }),
        message: t.String({ minLength: 10 }),
      }),
    }
  );
