/**
 * Someone's overall review rating — buyer and seller reviews together, the
 * same figure their profile leads with. The API sends null until somebody
 * has reviewed them.
 */
export type Rating = { average: number; count: number };
