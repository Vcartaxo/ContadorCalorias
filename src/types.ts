export interface Food {
  nome: string;
  kcal: number;
  proteina: number;
  hidratos: number;
  lipidos: number;
}

export interface LogEntry {
  id: string;
  food: Food;
  amount: number; // in grams
  timestamp: number;
  mealType: string;
}
