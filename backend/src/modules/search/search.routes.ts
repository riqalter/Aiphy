import { Elysia, t } from 'elysia';
import { SearchService } from './search.service';

export const searchRoutes = new Elysia({ prefix: '/api/search' })
  // Search catalog endpoint (public)
  .get(
    '/',
    async ({ query }) => {
      const results = await SearchService.searchCatalog(query.q);
      return {
        success: true,
        data: results,
      };
    },
    {
      query: t.Object({
        q: t.String({ minLength: 1, error: 'Search term is required' }),
      }),
    }
  );
