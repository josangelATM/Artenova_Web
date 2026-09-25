import { useEffect } from "react";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { applySeo } from "../lib/seo";

const policySections = [
  {
    title: "Política de uso y durabilidad de plaquitas para mascotas",
    paragraphs: [
      "Nuestras plaquitas están elaboradas en acrílico y están diseñadas como accesorios de identificación para mascotas. Su duración puede variar dependiendo del uso diario, nivel de actividad y comportamiento de cada mascota.",
      "Golpes constantes contra superficies, juegos bruscos, mordidas, tirones o enganches pueden provocar rayones, desgaste, debilitamiento o rotura de la pieza, especialmente en el área donde se coloca la argolla.",
      "Aunque el acrílico es un material resistente para un uso normal, no es un material indestructible, por lo que no podemos garantizar una duración permanente del producto.",
      "Los daños ocasionados por el uso, desgaste natural, golpes, mordidas, tirones o actividad propia de la mascota no serán considerados defectos de fabricación.",
    ],
  },
  {
    title: "Política de pagos y abonos",
    subsections: [
      {
        title: "Abono para iniciar el pedido",
        paragraphs: [
          "Para comenzar la fabricación de productos personalizados será necesario realizar un abono previo del 30% o 50% del valor total, dependiendo del nivel de personalización, materiales y características del proyecto.",
          "El porcentaje requerido será informado antes de confirmar el pedido.",
        ],
      },
      {
        title: "Inicio de fabricación",
        paragraphs: ["La fabricación comenzará únicamente después de que el abono haya sido recibido y confirmado."],
      },
      {
        title: "Pago del saldo restante",
        paragraphs: ["El saldo pendiente podrá cancelarse contra entrega cuando:"],
        list: [
          "El pedido sea entregado mediante nuestro servicio de delivery.",
          "El cliente realice el retiro en nuestro taller físico.",
        ],
        afterList: "Para envíos a otras provincias, el pedido deberá estar 100% pagado antes de ser despachado.",
      },
      {
        title: "Abonos y reembolsos",
        paragraphs: ["Una vez iniciada la fabricación, los abonos realizados no son reembolsables, debido a que son destinados a materiales, diseño, preparación y producción del pedido."],
      },
      {
        title: "Modificaciones adicionales",
        paragraphs: ["Los cambios solicitados posteriormente que impliquen nuevos materiales, modificaciones significativas o cambios en las cantidades pueden generar costos adicionales. Cualquier ajuste será informado antes de continuar con la producción."],
      },
    ],
  },
  {
    title: "Política de diseño y aprobación",
    paragraphs: [
      "Todos nuestros productos personalizados pasan por un proceso de diseño y aprobación previa antes de iniciar su producción.",
      "El cliente es responsable de revisar cuidadosamente la propuesta enviada, incluyendo nombres, fechas, textos, fotografías, colores y demás información personalizada.",
      "Una vez que el diseño sea aprobado por el cliente, se considerará como versión final y se procederá con la producción. Después de esta aprobación, no nos hacemos responsables por errores que hayan sido previamente aceptados, como faltas ortográficas, datos incorrectos o elementos aprobados por el cliente.",
      "Las modificaciones solicitadas antes de la aprobación podrán realizarse dentro de lo acordado. Sin embargo, cambios adicionales o cambios significativos en el diseño pueden generar costos adicionales o afectar el tiempo de entrega.",
      "Una vez iniciada la producción, no se podrán realizar cambios en el diseño.",
      "La aprobación del diseño confirma que el cliente acepta la composición, información y presentación final del producto.",
    ],
  },
  {
    title: "Política de retiro de pedidos",
    paragraphs: [
      "Con el fin de mantener una correcta organización de nuestro inventario, los pedidos terminados podrán permanecer en nuestro taller por un máximo de 45 días calendario.",
      "Este período comenzará a contar desde la fecha de hoy para los pedidos que ya se encuentren pendientes de retiro, y desde la fecha de notificación de finalización para los nuevos pedidos.",
      "Una vez transcurridos los 45 días calendario, el pedido será descartado y no aplicará devolución del pago realizado, incluyendo abonos o pagos completos.",
      "Agradecemos tu comprensión y te recomendamos coordinar el retiro o entrega de tu pedido dentro del período establecido.",
    ],
  },
];

export function PoliciesPage() {
  useEffect(() => {
    applySeo({
      title: "Políticas",
      description: "Consulta las políticas de uso, pagos, diseño, aprobación y retiro de pedidos de Artenova.",
      path: "/politicas",
      type: "website",
    });
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={{ xs: 2.5, md: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 52 }, lineHeight: 1 }}>
            Políticas
          </Typography>
          <Typography color="text.secondary" mt={1.5}>
            Información sobre el uso de nuestros productos y las condiciones de compra y retiro.
          </Typography>
        </Box>

        {policySections.map((section) => (
          <Paper
            component="section"
            key={section.title}
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              border: "1px solid rgba(64,44,37,.1)",
              bgcolor: "rgba(255,250,245,.92)",
            }}
          >
            <Stack spacing={2}>
              <Typography variant="h4" component="h2" fontWeight={900} sx={{ fontSize: { xs: 21, sm: 25 }, lineHeight: 1.2 }}>
                {section.title}
              </Typography>
              {section.paragraphs?.map((paragraph) => (
                <Typography key={paragraph} color="text.secondary" sx={{ lineHeight: 1.75 }}>
                  {paragraph}
                </Typography>
              ))}
              {section.subsections?.map((subsection) => (
                <Box key={subsection.title}>
                  <Typography fontWeight={900} mb={0.75}>
                    {subsection.title}
                  </Typography>
                  <Stack spacing={1.25}>
                    {subsection.paragraphs.map((paragraph) => (
                      <Typography key={paragraph} color="text.secondary" sx={{ lineHeight: 1.75 }}>
                        {paragraph}
                      </Typography>
                    ))}
                    {subsection.list && (
                      <Box component="ul" sx={{ m: 0, pl: 3, color: "text.secondary" }}>
                        {subsection.list.map((item) => (
                          <Typography key={item} component="li" sx={{ lineHeight: 1.75, pl: 0.5 }}>
                            {item}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {subsection.afterList && (
                      <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                        {subsection.afterList}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}

        <Typography textAlign="center" fontWeight={800} color="primary.dark" sx={{ py: 1 }}>
          Artenova — comprometidos en ofrecerte lo mejor en cada detalle.
        </Typography>
      </Stack>
    </Container>
  );
}
