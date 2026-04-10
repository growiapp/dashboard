/**
 * METRIC DEFINITIONS — Diccionario vivo de métricas
 * Usado para tooltips, ayuda contextual y consistencia documental.
 */

export const METRIC_DEFS = {
  IDS_TRABAJADOS: {
    nombre: 'IDs trabajados',
    definicion: 'Cantidad total de IDs únicos procesados por el colaborador o el equipo en el período.',
    formula: 'Suma de columna "IDs trabajados" en histórico (fallback 1 por fila si vacío)',
    unidad: 'IDs',
    fuente: 'historico.csv',
    limitaciones: 'No pondera por complejidad de flujo. Un ID en Soporte puede requerir más trabajo que uno en Demanda.',
  },
  IDS_POR_DIA_ACTIVO: {
    nombre: 'IDs por día activo',
    definicion: 'Productividad promedio en días en que el colaborador o equipo tuvo actividad real registrada.',
    formula: 'IDs trabajados / días con al menos un registro en histórico',
    unidad: 'IDs/día',
    fuente: 'historico.csv',
    limitaciones: 'No considera ausencias justificadas. Un colaborador con pocos días puede mostrar ratio alto.',
  },
  EFECTIVIDAD_SUG: {
    nombre: 'Efectividad por sugerencia',
    definicion: 'Porcentaje de sugerencias auditadas clasificadas como correctas (EstadoFinal OK + MotivoRechazo OK).',
    formula: 'sugerencias correctas / total sugerencias auditadas',
    unidad: '%',
    fuente: 'auditados.csv',
    limitaciones: 'No refleja la complejidad del caso. Un caso con 10 sugerencias y 1 error tiene 90% de efectividad a nivel sugerencia.',
    target: '≥ 90%',
    esMetricaPrincipal: true,
  },
  EFECTIVIDAD_CASO: {
    nombre: 'Efectividad por caso',
    definicion: 'Porcentaje de casos auditados en que TODAS las sugerencias son correctas.',
    formula: 'casos con todas las sugerencias correctas / total casos auditados',
    unidad: '%',
    fuente: 'auditados.csv',
    limitaciones: 'Métrica contextual — complementa la lectura por sugerencia. Un solo error en un caso lo clasifica como incorrecto.',
    esMetricaPrincipal: false,
  },
  HOLD_RELATIVO: {
    nombre: 'HOLD relativo',
    definicion: 'Proporción de IDs únicos que pasaron por HOLD al menos una vez, sobre el total de IDs únicos en el período.',
    formula: 'IDs únicos en HOLD / IDs únicos totales',
    unidad: '%',
    fuente: 'historico.csv',
    limitaciones: 'Un ID puede haber pasado por HOLD múltiples veces — se cuenta una sola vez.',
  },
  LEAD_TIME_HOLD: {
    nombre: 'Lead time HOLD',
    definicion: 'Días calendario desde el primer registro HOLD de un ID hasta su DONE, mismo usuario.',
    formula: 'fecha DONE - fecha primer HOLD (días calendario)',
    unidad: 'días',
    fuente: 'historico.csv',
    limitaciones: 'Solo incluye ciclos con DONE confirmado en el dataset. IDs sin DONE no entran al cálculo.',
  },
  ANTIGUEDAD: {
    nombre: 'Antigüedad',
    definicion: 'Días transcurridos desde la fecha de ingreso del colaborador hasta hoy.',
    formula: 'hoy - fecha_ingreso (días)',
    unidad: 'días / meses',
    fuente: 'equipo_colaboradores.csv',
    limitaciones: 'Depende de que la fecha de ingreso esté cargada correctamente en el CSV de equipo.',
  },
}
