export interface DataSample {
  id: string;
  words: Metadata;
  entities: Metadata;
}

export interface Metadata {
  entity_type?: string;
  word: string;
  category: string;
  normalized_frequency: number;
  frequency: number;
  normalized_frequency_diff_pos_neg: number;
  frequency_diff_pos_neg: number;
  sample: string[];
}
