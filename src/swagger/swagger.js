const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

const ec2ServerUrl =
  "http://ec2-51-24-120-153.eu-west-2.compute.amazonaws.com:3000";
const localServerUrl = `http://localhost:${process.env.PORT || 3000}`;

const servers = [
  {
    url: ec2ServerUrl,
    description: "AWS EC2 Cloud Server (Live / Staging)",
  },
  {
    url: localServerUrl,
    description: "Local Development Server",
  },
  {
    url: "/",
    description: "Current Host (Relative URL)",
  },
];

if (
  process.env.APP_BASE_URL &&
  !servers.some((s) => s.url === process.env.APP_BASE_URL)
) {
  servers.unshift({
    url: process.env.APP_BASE_URL,
    description: "Configured App Server",
  });
}

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Butler App REST API",
      version: "1.0.0",
      description:
        "Official API Specification for Butler App - Express.js backend with Authentication, Profile Completion, Hobbies, 12 Houses of Gentlemen, and Activity Feed.",
      contact: {
        name: "Butler App Engineering",
        url: "https://butler.app",
      },
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter your JWT token obtained from /api/auth/register or /api/auth/login",
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/*.js").replace(/\\/g, "/")],
};

const swaggerSpec = swaggerJsDoc(options);

function setupSwagger(app) {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
      .swagger-ui .topbar { background-color: #1c1917; border-bottom: 2px solid #d86b49; }
      .swagger-ui .topbar a span { font-weight: bold; color: #e07a5f; }
      body { background-color: #141211; color: #e5e7eb; }
      .swagger-ui .info .title { color: #e07a5f; }
      .swagger-ui .scheme-container { background-color: #262320; }
      .swagger-ui .opblock .opblock-summary-method { border-radius: 4px; font-weight: bold; }
    `,
      customSiteTitle: "Butler App API Docs - Swagger UI",
    }),
  );

  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(swaggerSpec);
  });
}

module.exports = setupSwagger;
