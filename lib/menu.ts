export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  recipe?: string[];
};

export const CATEGORIES = ["TẤT CẢ", "THỨC UỐNG", "THỨC ĂN", "COMBO", "ĂN VẶT"];

export const PRODUCTS: Product[] = [
  // THỨC UỐNG
  { id: "d1", name: "AQUARIUS bù nước", price: 12000, category: "THỨC UỐNG" },
  { id: "d2", name: "Bò Húc", price: 17000, category: "THỨC UỐNG" },
  { id: "d3", name: "Pepsi", price: 10000, category: "THỨC UỐNG" },
  { id: "d4", name: "Nước Suối", price: 8000, category: "THỨC UỐNG" },
  { id: "d5", name: "NUTRI", price: 12000, category: "THỨC UỐNG" },
  { id: "d6", name: "Revive trắng", price: 12000, category: "THỨC UỐNG" },
  { id: "d7", name: "Revive Chanh Muối", price: 12000, category: "THỨC UỐNG" },
  { id: "d8", name: "C2 chanh", price: 12000, category: "THỨC UỐNG" },
  { id: "d9", name: "Warrior Dâu", price: 12000, category: "THỨC UỐNG" },
  { id: "d10", name: "Warrior Nho", price: 12000, category: "THỨC UỐNG" },
  { id: "d11", name: "C2 trà đào", price: 12000, category: "THỨC UỐNG" },
  { id: "d12", name: "Khoáng lạt", price: 10000, category: "THỨC UỐNG" },
  { id: "d13", name: "Sting dâu", price: 10000, category: "THỨC UỐNG" },
  { id: "d14", name: "Trà việt quất mật ong", price: 12000, category: "THỨC UỐNG" },
  { id: "d15", name: "Sting Vàng", price: 10000, category: "THỨC UỐNG" },
  { id: "d16", name: "Nước tăng lực 247", price: 12000, category: "THỨC UỐNG" },
  { id: "d17", name: "Trà xanh không độ", price: 12000, category: "THỨC UỐNG" },
  { id: "d18", name: "Coca Cola lon", price: 12000, category: "THỨC UỐNG" },
  { id: "d19", name: "Khoáng ngọt Đảnh Thạnh", price: 12000, category: "THỨC UỐNG" },

  // THỨC ĂN
  { id: "f1", name: "Combo hồ lô, xúc xích, cá, tôm chiên", price: 25000, category: "COMBO", recipe: ["1/2 xúc xích", "3 hồ lô", "4 cá", "4 tôm"] },
  { id: "f2", name: "Mì xào xúc xích", price: 18000, category: "THỨC ĂN", recipe: ["1 cây xúc xích"] },
  { id: "f3", name: "Mì gói nước", price: 10000, category: "THỨC ĂN" },
  { id: "f4", name: "Khoai tây, xúc xích, cá viên chiên", price: 25000, category: "COMBO", recipe: ["1 phần khoai tây", "1/2 xúc xích", "5 cá tôm"] },
  { id: "f5", name: "Mì nước xúc xích", price: 18000, category: "THỨC ĂN", recipe: ["1 cây xúc xích"] },
  { id: "f6", name: "Cơm chiên trứng, xúc xích", price: 26000, category: "THỨC ĂN", recipe: ["1 cây xúc xích", "1 trứng"] },
  { id: "f7", name: "Mì nước cá viên chiên", price: 20000, category: "THỨC ĂN", recipe: ["3 cá", "3 tôm"] },
  { id: "f8", name: "Khoai tây chiên", price: 15000, category: "ĂN VẶT", recipe: ["1 phần khoai tây"] },
  { id: "f9", name: "Mì xào xúc xích Đức chiên", price: 22000, category: "THỨC ĂN", recipe: ["1 cây xúc xích"] },
  { id: "f10", name: "Cơm chiên trứng", price: 20000, category: "THỨC ĂN", recipe: ["1 trứng"] },
  { id: "f11", name: "Mì xào", price: 12000, category: "THỨC ĂN" },
  { id: "f12", name: "Mì xào cá viên chiên", price: 20000, category: "THỨC ĂN", recipe: ["3 cá", "3 tôm"] },
  { id: "f13", name: "Mì xào trứng, xúc xích", price: 24000, category: "THỨC ĂN", recipe: ["1 cây xúc xích", "1 trứng"] },
  { id: "f14", name: "Hồ lô chiên (4 viên)", price: 10000, category: "ĂN VẶT", recipe: ["4 viên hồ lô"] },
  { id: "f15", name: "Cá, tôm viên chiên (8 viên)", price: 10000, category: "ĂN VẶT", recipe: ["4 cá", "4 tôm"] },
  { id: "f16", name: "Mì xào trứng", price: 18000, category: "THỨC ĂN", recipe: ["1 trứng"] },
  { id: "f17", name: "Xúc xích Đức chiên (1 cây)", price: 10000, category: "ĂN VẶT", recipe: ["1 cây xúc xích"] },
  { id: "f18", name: "Mì nước trứng", price: 18000, category: "THỨC ĂN", recipe: ["1 trứng"] },

  // ĂN VẶT & SNACK
  { id: "s1", name: "Phồng tôm cay", price: 6000, category: "ĂN VẶT" },
  { id: "s2", name: "Khoai tây bò nướng", price: 8000, category: "ĂN VẶT" },
  { id: "s3", name: "Khoai tây rong biển", price: 8000, category: "ĂN VẶT" },
  { id: "s4", name: "Snack da heo", price: 6000, category: "ĂN VẶT" },
  { id: "s5", name: "Muối ớt đỏ", price: 6000, category: "ĂN VẶT" },
  { id: "s6", name: "Muối ớt xanh", price: 6000, category: "ĂN VẶT" },
  { id: "s7", name: "Mực lăn muối ớt", price: 6000, category: "ĂN VẶT" },
  { id: "s8", name: "Mực lăn cay đặc biệt", price: 6000, category: "ĂN VẶT" },
];
