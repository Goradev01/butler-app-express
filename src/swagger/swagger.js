const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Butler App REST API',
      version: '1.0.0',
      description: 'Official API Specification for Butler App - Express.js backend with Authentication, Profile Completion, Hobbies, 12 Houses of Gentlemen, and Activity Feed.',
      contact: {
        name: 'Butler App Engineering',
        url: 'https://butler.app'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /api/auth/register or /api/auth/login'
        }
      }
    }
  },
  apis: [
    path.join(__dirname, '../routes/auth.routes.js'),
    path.join(__dirname, '../routes/profile.routes.js'),
    path.join(__dirname, '../routes/hobbies.routes.js'),
    path.join(__dirname, '../routes/houses.routes.js'),
    path.join(__dirname, '../routes/feed.routes.js')
  ]
};

const swaggerSpec = swaggerJsDoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { background-color: #1c1917; border-bottom: 2px solid #d86b49; }
      .swagger-ui .topbar a span { font-weight: bold; color: #e07a5f; }
      body { background-color: #141211; color: #e5e7eb; }
      .swagger-ui .info .title { color: #e07a5f; }
      .swagger-ui .scheme-container { background-color: #262320; }
      .swagger-ui .opblock .opblock-summary-method { border-radius: 4px; font-weight: bold; }
    `,
    customSiteTitle: 'Butler App API Docs - Swagger UI'
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  });
}

module.exports = setupSwagger;
