/**
 * Swagger/OpenAPI Configuration
 * Defines API documentation structure and metadata
 */

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./app');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PattyShack API',
      version: '1.0.0',
      description: 'Restaurant Operations Platform API - Comprehensive system for managing restaurant operations including tasks, inventory, schedules, temperatures, invoices, and analytics.',
      contact: {
        name: 'API Support',
        email: 'support@pattyshack.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}${config.apiPrefix}`,
        description: 'Development server'
      },
      {
        url: `https://api.pattyshack.com${config.apiPrefix}`,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Detailed error description'
            },
            stack: {
              type: 'string',
              description: 'Stack trace (development only)'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['crew', 'manager', 'district', 'regional', 'corporate'],
              description: 'User role level'
            },
            locationId: {
              type: 'integer',
              nullable: true,
              description: 'Primary location ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Location: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Location ID'
            },
            name: {
              type: 'string',
              description: 'Location name'
            },
            type: {
              type: 'string',
              description: 'Location type (e.g., restaurant, warehouse)'
            },
            address: {
              type: 'string',
              description: 'Physical address'
            },
            managerId: {
              type: 'integer',
              nullable: true,
              description: 'Manager user ID'
            },
            districtId: {
              type: 'integer',
              nullable: true,
              description: 'District ID for hierarchy'
            },
            regionId: {
              type: 'integer',
              nullable: true,
              description: 'Region ID for hierarchy'
            },
            brandId: {
              type: 'integer',
              nullable: true,
              description: 'Brand ID for hierarchy'
            },
            active: {
              type: 'boolean',
              description: 'Whether location is active'
            },
            metadata: {
              type: 'object',
              description: 'Additional location metadata'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Task ID'
            },
            title: {
              type: 'string',
              description: 'Task title'
            },
            description: {
              type: 'string',
              description: 'Task description'
            },
            locationId: {
              type: 'integer',
              description: 'Location where task is assigned'
            },
            assignedTo: {
              type: 'integer',
              nullable: true,
              description: 'User ID of assignee'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'overdue'],
              description: 'Task status'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Task priority level'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Task due date'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Completion timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        TemperatureLog: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Log ID'
            },
            locationId: {
              type: 'integer',
              description: 'Location ID'
            },
            equipmentId: {
              type: 'string',
              description: 'Equipment identifier'
            },
            equipmentType: {
              type: 'string',
              enum: ['freezer', 'fridge', 'hot_hold'],
              description: 'Type of equipment'
            },
            temperature: {
              type: 'number',
              format: 'float',
              description: 'Temperature reading in Fahrenheit'
            },
            recordedBy: {
              type: 'integer',
              description: 'User ID who recorded temperature'
            },
            recordedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When temperature was recorded'
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Additional notes'
            }
          }
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Item ID'
            },
            locationId: {
              type: 'integer',
              description: 'Location ID'
            },
            name: {
              type: 'string',
              description: 'Item name'
            },
            sku: {
              type: 'string',
              description: 'Stock keeping unit'
            },
            category: {
              type: 'string',
              description: 'Item category'
            },
            unit: {
              type: 'string',
              description: 'Unit of measurement'
            },
            parLevel: {
              type: 'number',
              format: 'float',
              description: 'Par level quantity'
            },
            currentQuantity: {
              type: 'number',
              format: 'float',
              description: 'Current quantity on hand'
            },
            unitCost: {
              type: 'number',
              format: 'float',
              description: 'Cost per unit'
            }
          }
        },
        Schedule: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Schedule ID'
            },
            locationId: {
              type: 'integer',
              description: 'Location ID'
            },
            userId: {
              type: 'integer',
              description: 'Scheduled user ID'
            },
            shiftDate: {
              type: 'string',
              format: 'date',
              description: 'Shift date'
            },
            startTime: {
              type: 'string',
              description: 'Shift start time'
            },
            endTime: {
              type: 'string',
              description: 'Shift end time'
            },
            position: {
              type: 'string',
              description: 'Job position for shift'
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'clocked_in', 'clocked_out', 'no_show'],
              description: 'Shift status'
            },
            actualClockIn: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Actual clock in time'
            },
            actualClockOut: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Actual clock out time'
            }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Invoice ID'
            },
            locationId: {
              type: 'integer',
              description: 'Location ID'
            },
            vendorName: {
              type: 'string',
              description: 'Vendor name'
            },
            invoiceNumber: {
              type: 'string',
              description: 'Invoice number'
            },
            invoiceDate: {
              type: 'string',
              format: 'date',
              description: 'Invoice date'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Payment due date'
            },
            totalAmount: {
              type: 'number',
              format: 'float',
              description: 'Total invoice amount'
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'paid', 'rejected'],
              description: 'Invoice status'
            },
            lineItems: {
              type: 'array',
              description: 'Invoice line items',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                  total: { type: 'number' }
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Unauthorized',
                message: 'No token provided'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Forbidden',
                message: 'You do not have permission to perform this action'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Not Found',
                message: 'The requested resource was not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Invalid request data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Validation Error',
                message: 'Invalid input data'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Locations',
        description: 'Location management and hierarchy'
      },
      {
        name: 'Tasks',
        description: 'Task management and tracking'
      },
      {
        name: 'Temperatures',
        description: 'Temperature logging and monitoring'
      },
      {
        name: 'Inventory',
        description: 'Inventory management and tracking'
      },
      {
        name: 'Schedules',
        description: 'Employee scheduling and time tracking'
      },
      {
        name: 'Invoices',
        description: 'Invoice management and approval workflow'
      },
      {
        name: 'Analytics',
        description: 'Reporting and analytics'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/server/index.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
