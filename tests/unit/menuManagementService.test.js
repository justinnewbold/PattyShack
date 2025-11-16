/**
 * MenuManagementService Unit Tests
 * Tests business logic for menu management and recipe costing
 */

const MenuManagementService = require('../../src/services/MenuManagementService');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('MenuManagementService', () => {
  let testLocation;
  let testUser;
  let pool;

  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
    pool = getTestPool();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    testLocation = await createTestLocation({
      id: 'test-location-1',
      code: 'TEST-001'
    });

    testUser = await createTestUser({
      id: 'test-user-1',
      role: 'manager',
      location_id: testLocation.id
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Menu Categories', () => {
    it('should create a menu category', async () => {
      const categoryData = {
        location_id: testLocation.id,
        name: 'Appetizers',
        description: 'Tasty starters',
        display_order: 1,
        is_active: true
      };

      const category = await MenuManagementService.createMenuCategory(categoryData, testUser.id);

      expect(category).toBeDefined();
      expect(category.name).toBe('Appetizers');
      expect(category.location_id).toBe(testLocation.id);
      expect(category.display_order).toBe(1);
    });

    it('should get all menu categories for a location', async () => {
      await pool.query(`
        INSERT INTO menu_categories (id, location_id, name, display_order)
        VALUES
          ('cat1', $1, 'Appetizers', 1),
          ('cat2', $1, 'Entrees', 2)
      `, [testLocation.id]);

      const categories = await MenuManagementService.getMenuCategories(testLocation.id);

      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('Appetizers');
      expect(categories[1].name).toBe('Entrees');
    });
  });

  describe('Menu Items', () => {
    let testCategory;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO menu_categories (id, location_id, name, display_order)
        VALUES ('test-cat', $1, 'Burgers', 1)
        RETURNING *
      `, [testLocation.id]);
      testCategory = result.rows[0];
    });

    it('should create a menu item', async () => {
      const itemData = {
        category_id: testCategory.id,
        name: 'Classic Burger',
        description: 'Our signature burger',
        base_price: 12.99,
        target_food_cost_percentage: 30.00,
        dietary_info: ['gluten-free-available'],
        allergens: ['dairy', 'soy'],
        is_available: true
      };

      const item = await MenuManagementService.createMenuItem(itemData, testUser.id);

      expect(item).toBeDefined();
      expect(item.name).toBe('Classic Burger');
      expect(item.base_price).toBe('12.99');
      expect(item.target_food_cost_percentage).toBe('30.00');
    });

    it('should get menu items by category', async () => {
      await pool.query(`
        INSERT INTO menu_items (id, category_id, name, base_price)
        VALUES
          ('item1', $1, 'Cheeseburger', 11.99),
          ('item2', $1, 'Bacon Burger', 13.99)
      `, [testCategory.id]);

      const items = await MenuManagementService.getMenuItemsByCategory(testCategory.id);

      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('Cheeseburger');
      expect(items[1].name).toBe('Bacon Burger');
    });

    it('should update menu item price', async () => {
      await pool.query(`
        INSERT INTO menu_items (id, category_id, name, base_price)
        VALUES ('item1', $1, 'Burger', 10.99)
      `, [testCategory.id]);

      const updated = await MenuManagementService.updateMenuItem(
        'item1',
        { base_price: 11.99 },
        testUser.id
      );

      expect(updated.base_price).toBe('11.99');
    });
  });

  describe('Recipes', () => {
    let testMenuItem;
    let testInventoryItem;

    beforeEach(async () => {
      const catResult = await pool.query(`
        INSERT INTO menu_categories (id, location_id, name, display_order)
        VALUES ('test-cat', $1, 'Burgers', 1)
        RETURNING *
      `, [testLocation.id]);

      const itemResult = await pool.query(`
        INSERT INTO menu_items (id, category_id, name, base_price)
        VALUES ('test-item', $1, 'Burger', 10.99)
        RETURNING *
      `, [catResult.rows[0].id]);
      testMenuItem = itemResult.rows[0];

      const invResult = await pool.query(`
        INSERT INTO inventory (id, location_id, item_name, category, unit, current_quantity, unit_price)
        VALUES ('test-inv', $1, 'Ground Beef', 'meat', 'lb', 100, 4.50)
        RETURNING *
      `, [testLocation.id]);
      testInventoryItem = invResult.rows[0];
    });

    it('should create a recipe', async () => {
      const recipeData = {
        menu_item_id: testMenuItem.id,
        version: '1.0',
        prep_time_minutes: 10,
        cook_time_minutes: 15,
        instructions: 'Grill the burger',
        yield_quantity: 1
      };

      const recipe = await MenuManagementService.createRecipe(recipeData, testUser.id);

      expect(recipe).toBeDefined();
      expect(recipe.menu_item_id).toBe(testMenuItem.id);
      expect(recipe.prep_time_minutes).toBe(10);
    });

    it('should add ingredients to recipe', async () => {
      const recipeResult = await pool.query(`
        INSERT INTO recipes (id, menu_item_id, version)
        VALUES ('test-recipe', $1, '1.0')
        RETURNING *
      `, [testMenuItem.id]);

      const ingredientData = {
        recipe_id: recipeResult.rows[0].id,
        inventory_item_id: testInventoryItem.id,
        quantity: 0.25,
        unit: 'lb'
      };

      const ingredient = await MenuManagementService.addRecipeIngredient(ingredientData, testUser.id);

      expect(ingredient).toBeDefined();
      expect(ingredient.quantity).toBe('0.250');
    });

    it('should calculate recipe cost', async () => {
      const recipeResult = await pool.query(`
        INSERT INTO recipes (id, menu_item_id, version)
        VALUES ('test-recipe', $1, '1.0')
        RETURNING *
      `, [testMenuItem.id]);

      await pool.query(`
        INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, quantity, cost_per_unit, total_cost)
        VALUES ($1, $2, 0.25, 4.50, 1.13)
      `, [recipeResult.rows[0].id, testInventoryItem.id]);

      const cost = await MenuManagementService.calculateRecipeCost(recipeResult.rows[0].id);

      expect(parseFloat(cost)).toBeCloseTo(1.13, 2);
    });
  });

  describe('Menu Engineering Analysis', () => {
    let testCategory;

    beforeEach(async () => {
      const catResult = await pool.query(`
        INSERT INTO menu_categories (id, location_id, name, display_order)
        VALUES ('test-cat', $1, 'Burgers', 1)
        RETURNING *
      `, [testLocation.id]);
      testCategory = catResult.rows[0];

      // Create menu items with performance data
      await pool.query(`
        INSERT INTO menu_items (id, category_id, name, base_price)
        VALUES
          ('item1', $1, 'Star Item', 15.99),
          ('item2', $1, 'Puzzle Item', 18.99),
          ('item3', $1, 'Plow Horse', 9.99),
          ('item4', $1, 'Dog Item', 12.99)
      `, [testCategory.id]);

      // Add performance data
      await pool.query(`
        INSERT INTO menu_performance (menu_item_id, units_sold, contribution_margin, menu_mix_percentage)
        VALUES
          ('item1', 200, 10.50, 35.0),
          ('item2', 50, 12.00, 8.0),
          ('item3', 180, 3.50, 32.0),
          ('item4', 70, 4.00, 12.0)
      `);
    });

    it('should get menu engineering matrix', async () => {
      const matrix = await MenuManagementService.getMenuEngineeringMatrix(testLocation.id);

      expect(matrix).toBeDefined();
      expect(matrix.stars).toBeDefined();
      expect(matrix.puzzles).toBeDefined();
      expect(matrix.plow_horses).toBeDefined();
      expect(matrix.dogs).toBeDefined();
    });
  });

  describe('Profitability Analysis', () => {
    beforeEach(async () => {
      await pool.query(`
        INSERT INTO menu_categories (id, location_id, name, display_order)
        VALUES ('test-cat', $1, 'Burgers', 1)
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO menu_items (id, category_id, name, base_price)
        VALUES ('item1', 'test-cat', 'Test Burger', 12.99)
      `);

      await pool.query(`
        INSERT INTO recipes (id, menu_item_id, version, estimated_cost)
        VALUES ('recipe1', 'item1', '1.0', 3.90)
      `);
    });

    it('should calculate menu item profitability', async () => {
      const profitability = await MenuManagementService.getMenuProfitability(testLocation.id);

      expect(profitability).toBeDefined();
      expect(profitability.length).toBeGreaterThan(0);

      const item = profitability.find(p => p.name === 'Test Burger');
      expect(item).toBeDefined();
      expect(parseFloat(item.base_price)).toBe(12.99);
      expect(parseFloat(item.recipe_cost)).toBe(3.90);
    });
  });

  describe('Suggested Pricing', () => {
    beforeEach(async () => {
      await pool.query(`
        INSERT INTO menu_categories (id, location_id, name, display_order)
        VALUES ('test-cat', $1, 'Burgers', 1)
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO menu_items (id, category_id, name, base_price, target_food_cost_percentage)
        VALUES ('item1', 'test-cat', 'Test Burger', 12.99, 30.00)
      `);

      await pool.query(`
        INSERT INTO recipes (id, menu_item_id, version, estimated_cost)
        VALUES ('recipe1', 'item1', '1.0', 3.90)
      `);
    });

    it('should calculate suggested price based on target food cost', async () => {
      const suggested = await MenuManagementService.updateSuggestedPrice('item1');

      expect(suggested).toBeDefined();
      // 3.90 / 0.30 = 13.00
      expect(parseFloat(suggested.suggested_price)).toBeCloseTo(13.00, 2);
    });
  });
});
