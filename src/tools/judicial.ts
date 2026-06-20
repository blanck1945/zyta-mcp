import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import type { KairoApiClient } from "../apiClient.js";
import { jsonResult, toolError } from "../toolResult.js";

const portalSchema = z.enum(["pjn", "scba"]);

export function registerJudicialTools(
  server: McpServer,
  api: KairoApiClient
): void {
  server.registerTool(
    "zyta_judicial_portals_status",
    {
      description:
        "Estado de conexión de los portales judiciales PJN y SCBA (mismo usuario que el token JWT). GET /judicial/portals/status",
    },
    async () => {
      try {
        const data = await api.get<unknown>("/judicial/portals/status");
        return jsonResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_judicial_expedientes_list",
    {
      description:
        "Lista expedientes judiciales del usuario. Opcionalmente filtra por portal (pjn o scba). GET /judicial/expedientes",
      inputSchema: {
        portal: portalSchema.optional().describe(
          "Filtrar por portal judicial: pjn o scba"
        ),
      },
    },
    async (args) => {
      try {
        const q = args.portal ? `?portal=${encodeURIComponent(args.portal)}` : "";
        const data = await api.get<unknown>(`/judicial/expedientes${q}`);
        return jsonResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_judicial_expediente_get",
    {
      description:
        "Detalle de un expediente judicial con actuaciones. GET /judicial/expedientes/:id",
      inputSchema: {
        id: z.string().min(1).describe("Identificador del expediente en el API"),
      },
    },
    async (args) => {
      try {
        const data = await api.get<unknown>(
          `/judicial/expedientes/${encodeURIComponent(args.id)}`
        );
        return jsonResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_judicial_cursor_registrar_actuacion",
    {
      description:
        "Registra actuaciones en una causa sin portal a partir de un mensaje libre (Cursor/Claude). " +
        "El backend resuelve la causa entre las causas sin portal del usuario con IA, o usá expedienteId para fijar la causa. " +
        "Opcional: link (Sheets, etc.). POST /judicial/cursor/registrar-actuacion",
      inputSchema: {
        message: z
          .string()
          .min(1)
          .describe(
            "Texto con la tarea o novedad, ej. Hacer cálculo para caso Guzmán OSDE"
          ),
        link: z
          .string()
          .optional()
          .describe("URL opcional a incluir en la actuación (ej. Google Sheets)"),
        expedienteId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "UUID de expediente sin portal; si se omite, el API elige por IA según el mensaje"
          ),
      },
    },
    async (args) => {
      try {
        const body: { message: string; link?: string; expedienteId?: string } = {
          message: args.message,
        };
        if (args.link?.trim()) {
          body.link = args.link.trim();
        }
        if (args.expedienteId?.trim()) {
          body.expedienteId = args.expedienteId.trim();
        }
        const data = await api.post<unknown>(
          "/judicial/cursor/registrar-actuacion",
          body
        );
        return jsonResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
