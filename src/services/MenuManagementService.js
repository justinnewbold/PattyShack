/**
 * Menu Management Service
 *
 * Manages menu items, recipes, costing, and menu engineering analysis.
 * Part of Phase 18: Menu Management & Recipe Costing System
 */

const pool = require('../database/pool').getPool();
const AuditLogService = require('./AuditLogService');

class MenuManagementService {
  /**
   * Get all menu categories
   */
  async getCategories(locationId = null) {
    try {
      let query = `SELECT * FROM menu_categories WHERE 1=1`;
      const params = [];

      if (locationId) {
        query += ` AND (location_id = $1 OR location_id IS NULL)`;
        params.push(locationId);
      }

      query += ` ORDER BY display_order ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[MenuManagement] Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Create menu category
   */
  async createCategory(categoryData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { location_id, name, description, display_order } = categoryData;

      const result = await client.query(
        `INSERT INTO menu_categories (location_id, name, description, display_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [location_id, name, description, display_order || 0]
      );

      const category = result.rows[0];

      await AuditLogService.logCreate('menu_category', category.id, category, userId, location_id);
      await client.query('COMMIT');

      return category;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[MenuManagement] Error creating category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get menu items
   */
  async getMenuItems(filters = {}) {
    try {
      let query = `
        SELECT mi.*, mc.name as category_name, r.estimated_cost
        FROM menu_items mi
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        LEFT JOIN recipes r ON mi.id = r.menu_item_id AND r.is_active = true
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND mi.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.category_id) {
        query += ` AND mi.category_id = $${paramIndex++}`;
        params.push(filters.category_id);
      }

      if (filters.is_available !== undefined) {
        query += ` AND mi.is_available = $${paramIndex++}`;
        params.push(filters.is_available);
      }

      if (filters.is_featured !== undefined) {
        query += ` AND mi.is_featured = $${paramIndex++}`;
        params.push(filters.is_featured);
      }

      query += ` ORDER BY mc.display_order, mi.name`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[MenuManagement] Error getting menu items:', error);
      throw error;
    }
  }

  /**
   * Get full menu with categories
   */
  async getFullMenu(locationId = null) {
    try {
      let query = `SELECT * FROM full_menu WHERE 1=1`;
      const params = [];

      if (locationId) {
        query += ` AND category_id IN (
          SELECT id FROM menu_categories
          WHERE location_id = $1 OR location_id IS NULL
        )`;
        params.push(locationId);
      }

      const result = await pool.query(query, params);

      // Group by categories
      const menu = {};
      result.rows.forEach(row => {
        if (!menu[row.category_id]) {
          menu[row.category_id] = {
            id: row.category_id,
            name: row.category_name,
            order: row.category_order,
            items: []
          };
        }

        if (row.item_id) {
          menu[row.category_id].items.push({
            id: row.item_id,
            name: row.item_name,
            description: row.description,
            price: row.base_price,
            image_url: row.image_url,
            dietary_info: row.dietary_info,
            allergens: row.allergens,
            is_available: row.is_available,
            is_featured: row.is_featured,
            popularity_score: row.popularity_score,
            cost: row.cost,
            food_cost_pct: row.food_cost_pct
          });
        }
      });

      return Object.values(menu);
    } catch (error) {
      console.error('[MenuManagement] Error getting full menu:', error);
      throw error;
    }
  }

  /**
   * Create menu item
   */
  async createMenuItem(itemData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { location_id, category_id, name, description, base_price,
              target_food_cost_percentage, sku, image_url, prep_time_minutes,
              dietary_info, allergens, nutrition_info } = itemData;

      const result = await client.query(
        `INSERT INTO menu_items
         (location_id, category_id, name, description, base_price,
          target_food_cost_percentage, sku, image_url, prep_time_minutes,
          dietary_info, allergens, nutrition_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [location_id, category_id, name, description, base_price,
         target_food_cost_percentage || 30, sku, image_url, prep_time_minutes,
         JSON.stringify(dietary_info || {}), allergens, JSON.stringify(nutrition_info || {})]
      );

      const menuItem = result.rows[0];

      await AuditLogService.logCreate('menu_item', menuItem.id, menuItem, userId, location_id);
      await client.query('COMMIT');

      return menuItem;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[MenuManagement] Error creating menu item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update menu item
   */
  async updateMenuItem(itemId, updateData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const before = await client.query(
        `SELECT * FROM menu_items WHERE id = $1`,
        [itemId]
      );

      if (before.rows.length === 0) {
        throw new Error('Menu item not found');
      }

      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (['dietary_info', 'nutrition_info'].includes(key)) {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(JSON.stringify(updateData[key]));
        } else if (key !== 'id') {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(updateData[key]);
        }
      });

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE menu_items
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(itemId);

      const result = await client.query(query, values);

      await AuditLogService.logUpdate('menu_item', itemId, before.rows[0], result.rows[0], userId);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[MenuManagement] Error updating menu item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create recipe
   */
  async createRecipe(recipeData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { menu_item_id, version, name, yield_quantity, yield_unit,
              prep_instructions, cooking_instructions, plating_instructions,
              ingredients } = recipeData;

      const result = await client.query(
        `INSERT INTO recipes
         (menu_item_id, version, name, yield_quantity, yield_unit,
          prep_instructions, cooking_instructions, plating_instructions, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [menu_item_id, version || '1.0', name, yield_quantity || 1, yield_unit || 'serving',
         prep_instructions, cooking_instructions, plating_instructions, userId]
      );

      const recipe = result.rows[0];

      // Add ingredients
      if (ingredients && ingredients.length > 0) {
        for (const ing of ingredients) {
          await this.addRecipeIngredient(recipe.id, ing, client);
        }
      }

      // Calculate cost
      await this.calculateRecipeCost(recipe.id, client);

      await AuditLogService.logCreate('recipe', recipe.id, recipe, userId);
      await client.query('COMMIT');

      return this.getRecipeById(recipe.id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[MenuManagement] Error creating recipe:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add ingredient to recipe
   */
  async addRecipeIngredient(recipeId, ingredientData, client = null) {
    const shouldRelease = !client;
    if (!client) client = await pool.connect();

    try {
      const { inventory_item_id, ingredient_name, quantity, unit, cost_per_unit, prep_notes } = ingredientData;

      const total_cost = quantity * (cost_per_unit || 0);

      const result = await client.query(
        `INSERT INTO recipe_ingredients
         (recipe_id, inventory_item_id, ingredient_name, quantity, unit,
          cost_per_unit, total_cost, prep_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [recipeId, inventory_item_id, ingredient_name, quantity, unit,
         cost_per_unit, total_cost, prep_notes]
      );

      return result.rows[0];
    } catch (error) {
      console.error('[MenuManagement] Error adding ingredient:', error);
      throw error;
    } finally {
      if (shouldRelease) client.release();
    }
  }

  /**
   * Calculate recipe cost
   */
  async calculateRecipeCost(recipeId, client = null) {
    const shouldRelease = !client;
    if (!client) client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT calculate_recipe_cost($1) as total_cost`,
        [recipeId]
      );

      return result.rows[0].total_cost;
    } catch (error) {
      console.error('[MenuManagement] Error calculating recipe cost:', error);
      throw error;
    } finally {
      if (shouldRelease) client.release();
    }
  }

  /**
   * Get recipe with ingredients
   */
  async getRecipeById(recipeId) {
    try {
      const recipeResult = await pool.query(
        `SELECT r.*, mi.name as menu_item_name
         FROM recipes r
         LEFT JOIN menu_items mi ON r.menu_item_id = mi.id
         WHERE r.id = $1`,
        [recipeId]
      );

      if (recipeResult.rows.length === 0) {
        return null;
      }

      const ingredientsResult = await pool.query(
        `SELECT ri.*, i.item_name as inventory_name
         FROM recipe_ingredients ri
         LEFT JOIN inventory i ON ri.inventory_item_id = i.id
         WHERE ri.recipe_id = $1
         ORDER BY ri.ingredient_name`,
        [recipeId]
      );

      return {
        ...recipeResult.rows[0],
        ingredients: ingredientsResult.rows
      };
    } catch (error) {
      console.error('[MenuManagement] Error getting recipe:', error);
      throw error;
    }
  }

  /**
   * Get menu item profitability analysis
   */
  async getMenuItemProfitability(locationId = null) {
    try {
      let query = `SELECT * FROM menu_item_profitability WHERE 1=1`;
      const params = [];

      if (locationId) {
        query += ` AND location_id = $1`;
        params.push(locationId);
      }

      query += ` ORDER BY gross_profit DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[MenuManagement] Error getting profitability:', error);
      throw error;
    }
  }

  /**
   * Get menu engineering matrix
   */
  async getMenuEngineeringMatrix(locationId, startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT * FROM menu_engineering_matrix
         WHERE location_id = $1
           AND period_start >= $2
           AND period_end <= $3
         ORDER BY classification, contribution_margin DESC`,
        [locationId, startDate, endDate]
      );

      // Group by classification
      const matrix = {
        stars: [],
        puzzles: [],
        plow_horses: [],
        dogs: []
      };

      result.rows.forEach(item => {
        const key = item.classification.replace('_', '_') + 's';
        if (matrix[key]) {
          matrix[key].push(item);
        }
      });

      return matrix;
    } catch (error) {
      console.error('[MenuManagement] Error getting menu engineering matrix:', error);
      throw error;
    }
  }

  /**
   * Record menu performance
   */
  async recordMenuPerformance(performanceData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { menu_item_id, location_id, period_start, period_end,
              units_sold, total_revenue, total_cost } = performanceData;

      const gross_profit = total_revenue - total_cost;
      const food_cost_percentage = total_revenue > 0 ? (total_cost / total_revenue) * 100 : 0;
      const contribution_margin = gross_profit / units_sold;

      // Get total sales for menu mix
      const totalSalesResult = await client.query(
        `SELECT SUM(units_sold) as total FROM menu_performance
         WHERE location_id = $1 AND period_start = $2`,
        [location_id, period_start]
      );

      const totalSales = parseInt(totalSalesResult.rows[0]?.total || 0) + units_sold;
      const menu_mix_percentage = totalSales > 0 ? (units_sold / totalSales) * 100 : 0;

      const result = await client.query(
        `INSERT INTO menu_performance
         (menu_item_id, location_id, period_start, period_end, units_sold,
          total_revenue, total_cost, gross_profit, food_cost_percentage,
          contribution_margin, menu_mix_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (menu_item_id, location_id, period_start)
         DO UPDATE SET
           units_sold = EXCLUDED.units_sold,
           total_revenue = EXCLUDED.total_revenue,
           total_cost = EXCLUDED.total_cost,
           gross_profit = EXCLUDED.gross_profit,
           food_cost_percentage = EXCLUDED.food_cost_percentage,
           contribution_margin = EXCLUDED.contribution_margin,
           menu_mix_percentage = EXCLUDED.menu_mix_percentage
         RETURNING *`,
        [menu_item_id, location_id, period_start, period_end, units_sold,
         total_revenue, total_cost, gross_profit, food_cost_percentage,
         contribution_margin, menu_mix_percentage]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[MenuManagement] Error recording performance:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update suggested pricing
   */
  async updateSuggestedPricing(menuItemId) {
    try {
      const result = await pool.query(
        `SELECT update_suggested_price($1) as suggested_price`,
        [menuItemId]
      );

      return result.rows[0].suggested_price;
    } catch (error) {
      console.error('[MenuManagement] Error updating pricing:', error);
      throw error;
    }
  }
}

module.exports = new MenuManagementService();
