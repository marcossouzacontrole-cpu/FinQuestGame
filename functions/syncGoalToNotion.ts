import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal_id, parent_database_id } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('notion');

    // Fetch goal
    const goal = await base44.entities.Goal.filter({ id: goal_id, created_by: user.email });
    if (!goal || goal.length === 0) {
      return Response.json({ error: 'Goal not found' }, { status: 404 });
    }

    const goalData = goal[0];
    const progress = goalData.target_amount > 0 ? (goalData.current_amount / goalData.target_amount) * 100 : 0;

    // Create or update Notion page
    const pageData = {
      parent: parent_database_id ? 
        { database_id: parent_database_id } : 
        { type: 'page_id', page_id: await getDefaultPageId(accessToken) },
      icon: { type: 'emoji', emoji: goalData.icon || '🎯' },
      properties: {
        'title': {
          title: [{ text: { content: goalData.name || 'Meta Sem Nome' } }]
        },
        'Status': {
          select: { name: goalData.status === 'completed' ? 'Completa' : 'Em Progresso' }
        },
        'Progresso': {
          number: Math.round(progress)
        },
        'Meta': {
          number: goalData.target_amount
        },
        'Atual': {
          number: goalData.current_amount
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: `🎯 ${goalData.legendary_item || 'Item Lendário'}` } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: `Meta: R$ ${goalData.target_amount?.toFixed(2) || 0}` } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: `Progresso: R$ ${goalData.current_amount?.toFixed(2) || 0} (${progress.toFixed(1)}%)` } }]
          }
        },
        {
          object: 'block',
          type: 'divider',
          divider: {}
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: '📋 Plano de Ação' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: goalData.ai_plan || 'Sem plano gerado ainda.' } }]
          }
        }
      ]
    };

    // Check if goal already has notion_page_id
    let notionPageId = goalData.notion_page_id;
    
    if (notionPageId) {
      // Update existing page
      await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          icon: pageData.icon,
          properties: pageData.properties
        })
      });
    } else {
      // Create new page
      const createResponse = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify(pageData)
      });

      const notionPage = await createResponse.json();
      notionPageId = notionPage.id;

      // Save Notion page ID to goal
      await base44.entities.Goal.update(goal_id, {
        notion_page_id: notionPageId
      });
    }

    return Response.json({ 
      success: true,
      notion_url: `https://notion.so/${notionPageId.replace(/-/g, '')}`,
      message: 'Meta sincronizada com Notion!'
    });

  } catch (error) {
    console.error('Notion sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getDefaultPageId(accessToken) {
  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: { property: 'object', value: 'page' },
      page_size: 1
    })
  });
  
  const data = await response.json();
  return data.results[0]?.id;
}