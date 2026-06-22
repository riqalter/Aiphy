import { db } from '../../config/database';
import { faqs, supportTickets, partnershipInquiries } from '../../db/schema/support';
import { eq, asc } from 'drizzle-orm';
import { BadRequestError } from '../../lib/errors';

export class HelpService {
  // Get all FAQs
  static async getFAQs() {
    return await db.select().from(faqs).orderBy(asc(faqs.category), asc(faqs.order));
  }

  // Create a new support ticket (user facing)
  static async createTicket(userId: string, data: { subject: string; message: string }) {
    if (!data.subject || !data.message) {
      throw new BadRequestError('Subject and message are required');
    }

    const [ticket] = await db
      .insert(supportTickets)
      .values({
        userId,
        subject: data.subject,
        message: data.message,
        status: 'open',
      })
      .returning();

    return ticket;
  }

  // Handle Landing Page Partnership Inquiry Form
  static async createPartnershipInquiry(data: { name: string; email: string; message: string }) {
    if (!data.name || !data.email || !data.message) {
      throw new BadRequestError('All fields (name, email, message) are required');
    }

    if (!data.email.includes('@')) {
      throw new BadRequestError('Invalid email format');
    }

    const [inquiry] = await db
      .insert(partnershipInquiries)
      .values(data)
      .returning();

    return inquiry;
  }
}
