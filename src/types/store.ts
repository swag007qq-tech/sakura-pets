export type PetBadgeId = 'F' | 'R' | 'N' | 'M';

export interface PetSlot {
  id: string;
  slotNumber?: number;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  badges: PetBadgeId[];
  stock: number;
  inStock: boolean;
  imageUrl: string;
  imagePath?: string;
  isPlaceholder?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  currency: string;
  badges: PetBadgeId[];
  stock: number;
  inStock: boolean;
  imageUrl: string;
  imagePath: string;
}

export interface CartItem {
  petId: string;
  quantity: number;
}
