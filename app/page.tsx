"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, ShoppingCart, Plus, Info, X, Check, Truck, ChefHat, ChevronDown, History, Zap, ClipboardList, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { PRODUCTS, CATEGORIES, type Product } from "@/lib/menu";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Mock machines
const MACHINES = Array.from({ length: 40 }, (_, i) => ({
  id: `MÁY ${String(i + 1).padStart(2, "0")}`,
  name: `MÁY ${String(i + 1).padStart(2, "0")}`,
  number: i + 1,
  isOffline: i === 38 || i === 39, // Just for demo
}));

const ORDER_STORAGE_KEY = "netcafe-orders-v1";
const ORDER_RETENTION_MS = 24 * 60 * 60 * 1000;

type OrderStatus = "pending" | "preparing" | "serving" | "completed";
type MachineStatus = Exclude<OrderStatus, "completed"> | "empty";

type Order = {
  id: string;
  machineId: string;
  items: { product: Product; quantity: number }[];
  total: number;
  status: OrderStatus;
  time: string;
  createdAt: number;
};

type StoredOrder = Omit<Order, "createdAt"> & { createdAt?: number };

const pruneExpiredOrders = (items: Order[]) => {
  const now = Date.now();
  return items.filter((order) => now - order.createdAt < ORDER_RETENTION_MS);
};

export default function OrderPage() {
  // UI States
  const [activeTab, setActiveTab] = useState<"menu" | "preparing" | "history">("menu");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMachineGridOpen, setIsMachineGridOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [cartPulse, setCartPulse] = useState(false);
  const [hasHydratedOrders, setHasHydratedOrders] = useState(false);

  // Data States
  const [selectedMachineId, setSelectedMachineId] = useState("MÁY 01");
  const [activeCategory, setActiveCategory] = useState("TẤT CẢ");
  const [searchQuery, setSearchQuery] = useState("");
  const [machineSearch, setMachineSearch] = useState("");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);

  // Derived Data
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesCategory = activeCategory === "TẤT CẢ" || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const recentProducts = useMemo(() => {
    return PRODUCTS.filter(p => recentProductIds.includes(p.id)).slice(0, 4);
  }, [recentProductIds]);

  const machineStatuses = useMemo(() => {
    const statuses: Record<string, MachineStatus> = {};
    orders.forEach(o => {
      if (o.status === "completed") return;
      if (!statuses[o.machineId] || o.status === "pending") {
        statuses[o.machineId] = o.status;
      }
    });
    return statuses;
  }, [orders]);

  const filteredMachines = useMemo(() => {
    if (!machineSearch) return MACHINES;
    return MACHINES.filter(m => m.name.includes(machineSearch) || m.number.toString().includes(machineSearch));
  }, [machineSearch]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const rawOrders = localStorage.getItem(ORDER_STORAGE_KEY);
        if (rawOrders) {
          const parsedOrders = JSON.parse(rawOrders) as StoredOrder[];
          const normalizedOrders = parsedOrders.map((order) => ({
            ...order,
            createdAt: order.createdAt ?? Date.now(),
          }));
          setOrders(pruneExpiredOrders(normalizedOrders));
        }
      } catch {
        localStorage.removeItem(ORDER_STORAGE_KEY);
      } finally {
        setHasHydratedOrders(true);
      }
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!hasHydratedOrders) return;

    const prunedOrders = pruneExpiredOrders(orders);
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(prunedOrders));
  }, [orders, hasHydratedOrders]);

  useEffect(() => {
    const cleanupTimer = window.setInterval(() => {
      setOrders((prev) => pruneExpiredOrders(prev));
    }, 60 * 60 * 1000);

    return () => window.clearInterval(cleanupTimer);
  }, []);

  // Actions
  const addToCart = (product: Product) => {
    setAddingId(product.id);
    setTimeout(() => setAddingId(null), 500);
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 300);

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });

    toast.success(`Đã thêm ${product.name}`, { duration: 800 });

    // Update recent products
    setRecentProductIds(prev => Array.from(new Set([product.id, ...prev])).slice(0, 10));
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((item) => item.product.id !== productId));

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const sendOrder = () => {
    if (cart.length === 0) return;
    
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      machineId: selectedMachineId,
      items: [...cart],
      total: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      status: "pending",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      createdAt: Date.now(),
    };

    setOrders([newOrder, ...orders]);
    setIsCartOpen(false);
    setCart([]);
    toast.success("Order thành công!", { icon: <Check className="w-5 h-5 text-green-500" /> });
    setTimeout(() => setActiveTab("preparing"), 400);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    toast.info(`Cập nhật trạng thái thành công`);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeOrders = orders.filter(o => o.status !== "completed");
  const completedOrders = orders.filter(o => o.status === "completed");
  const preparingCount = activeOrders.length;
  const cartAmountLabel = totalAmount >= 1000 ? `${Math.round(totalAmount / 1000)}k` : totalAmount.toLocaleString("vi-VN");

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto app-shell overflow-hidden relative border-x border-white/10">
      <Toaster theme="dark" richColors position="top-center" />

      {/* HEADER - COMPACT & FUNCTIONAL */}
      <header className="sticky top-0 z-20 glass px-4 py-3 flex items-center justify-between gap-2.5">
        <Button 
          variant="secondary" 
          className="h-9 px-2.5 bg-primary/8 border border-primary/15 text-primary font-semibold text-xs rounded-lg gap-1 active:scale-95"
          onClick={() => setIsMachineGridOpen(true)}
        >
          {selectedMachineId} <ChevronDown className="w-4 h-4" />
        </Button>

        <div className="flex-1">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Tìm món..."
              className="pl-9 h-10 bg-[#0D1525] border border-white/8 rounded-xl text-sm focus-visible:ring-primary/40 placeholder:text-muted-foreground/80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Button 
          variant="ghost" 
          className={cn(
            "relative h-10 min-w-12 px-3 bg-[#0D1525] border border-white/8 rounded-xl gap-1.5",
            cartPulse && "cart-pulse"
          )}
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart className="w-5 h-5" />
          {totalAmount > 0 && <span className="text-[10px] font-semibold text-primary leading-none">{cartAmountLabel}</span>}
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in">
              {totalItems}
            </span>
          )}
        </Button>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="flex-1 overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
        {activeTab === "menu" ? (
          <>
            {/* CATEGORY SELECTOR - HORIZONTAL GHOST STYLE */}
            <div className="bg-background/35 py-2.5 shrink-0 border-b border-white/6">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex px-4 gap-2.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-all",
                        activeCategory === cat
                          ? "bg-primary/16 text-primary border border-primary/25"
                          : "text-[#7B8295] border border-transparent hover:bg-secondary/45"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
              </ScrollArea>
            </div>

            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 p-4 pb-32">
                
                {/* RECENT ORDERS - QUICK ACCESS */}
                {recentProducts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Món gần đây</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {recentProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className="flex items-center gap-3 p-2 rounded-xl bg-secondary/20 border border-border/50 hover:bg-secondary/40 active:scale-95 transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                            {p.category === "THỨC UỐNG" ? "🥤" : "🍜"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold truncate leading-none">{p.name}</p>
                            <p className="text-[10px] text-primary font-black mt-1">{p.price.toLocaleString("vi-VN")}đ</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRODUCT LIST - COMPACT DESIGN */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{activeCategory}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.18), ease: "easeOut" }}
                        whileTap={{ scale: 0.985 }}
                      >
                        <Card
                          className={cn(
                            "product-card gap-0 py-0 overflow-hidden border-white/8 bg-card/90 hover:border-primary/35 transition-all duration-300 rounded-xl h-[204px]",
                            addingId === product.id && "product-flash border-primary/50 bg-primary/8"
                          )}
                        >
                          <CardContent className="p-0 grid grid-rows-[1fr_56px] h-full relative">
                            <button
                              type="button"
                              className="min-h-0 flex flex-col items-center justify-center px-3 pt-5 pb-3 relative group text-center"
                              onClick={() => product.recipe && setRecipeProduct(product)}
                            >
                              <span className="text-[42px] leading-none mb-3 opacity-95 group-hover:scale-105 transition-transform duration-200">
                                {product.category === "THỨC UỐNG" ? "🥤" : "🍜"}
                              </span>
                              <span className="min-h-10 flex items-center justify-center text-sm font-semibold leading-5 line-clamp-2 px-1 text-foreground">
                                {product.name}
                              </span>
                              
                              {product.recipe && (
                                <span
                                  onClick={(e) => { e.stopPropagation(); setRecipeProduct(product); }}
                                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-secondary/55 flex items-center justify-center text-primary border border-white/6"
                                >
                                  <Info className="w-3 h-3" />
                                </span>
                              )}
                            </button>

                            <div className="bg-secondary/25 pl-3 pr-3 flex items-center justify-between border-t border-white/6">
                              <span className="text-primary font-semibold text-sm">
                                {product.price.toLocaleString("vi-VN")}đ
                              </span>
                              <Button
                                className="add-product-button bg-primary text-primary-foreground hover:bg-primary/90 border border-white/10 active:scale-90 transition-transform"
                                onClick={() => addToCart(product)}
                                aria-label={`Thêm ${product.name}`}
                              >
                                <Plus className="size-5 text-white stroke-[2.5]" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : activeTab === "preparing" ? (
          <ScrollArea className="h-full bg-secondary/8">
            <div className="p-4 space-y-4 pb-32">
              <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-6 h-6 text-primary" />
                  <h2 className="text-[22px] font-bold tracking-tight text-foreground">Đang làm</h2>
                </div>
                <Badge className="bg-primary/14 text-primary border-primary/25 font-semibold">
                  {preparingCount} đang xử lý
                </Badge>
              </div>
              
              {activeOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <ClipboardList className="w-11 h-11" />
                  </div>
                  <h3>Chưa có đơn nào đang xử lý</h3>
                  <p>Đơn mới sẽ xuất hiện tại đây khi bạn gửi order từ thực đơn.</p>
                  <Button className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold" onClick={() => setActiveTab("menu")}>
                    <Plus className="w-4 h-4 mr-2" /> Tạo đơn mới
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {activeOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border-2 border-border/50 rounded-3xl overflow-hidden shadow-2xl relative"
                    >
                      <div className={cn(
                        "px-5 py-4 border-b border-border flex justify-between items-center",
                        order.status === "pending" && "bg-orange-500/10",
                        order.status === "preparing" && "bg-yellow-500/10",
                        order.status === "serving" && "bg-cyan-500/10",
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-background/50 flex items-center justify-center border border-white/5 shadow-inner">
                            <span className="font-black text-xl text-primary">{order.machineId.split(" ")[1]}</span>
                          </div>
                          <div>
                            <p className="font-black text-xs text-primary uppercase tracking-tighter">{order.machineId}</p>
                            <span className="text-[10px] text-muted-foreground font-bold">{order.time}</span>
                          </div>
                        </div>
                        <Badge className={cn(
                          "font-black text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-xl",
                          order.status === "pending" && "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]",
                          order.status === "preparing" && "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]",
                          order.status === "serving" && "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]",
                        )}>
                          {order.status === "pending" && "Đơn Mới"}
                          {order.status === "preparing" && "Đang Nấu"}
                          {order.status === "serving" && "Đang Giao"}
                        </Badge>
                      </div>

                      <div className="p-5">
                        <div className="space-y-2 mb-6">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center group">
                              <span className="flex-1 font-black text-sm tracking-tight">
                                <span className="text-primary mr-2 font-black">x{item.quantity}</span>
                                {item.product.name}
                              </span>
                              {item.product.recipe && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 rounded-full bg-secondary/50"
                                  onClick={() => setRecipeProduct(item.product)}
                                >
                                  <Info className="w-3 h-3 text-primary" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Status Progress Bar */}
                        <div className="h-1.5 w-full bg-secondary/30 rounded-full mb-6 flex overflow-hidden">
                          <div className={cn(
                            "h-full transition-all duration-500",
                            order.status === "pending" && "w-1/4 bg-orange-500",
                            order.status === "preparing" && "w-2/3 bg-yellow-500",
                            order.status === "serving" && "w-full bg-cyan-500"
                          )} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {order.status === "pending" ? (
                            <>
                              <Button 
                                className="h-14 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs uppercase rounded-2xl shadow-lg transition-transform active:scale-95 col-span-2"
                                onClick={() => updateOrderStatus(order.id, "preparing")}
                              >
                                <ChefHat className="w-5 h-5 mr-2" /> Bắt đầu chế biến
                              </Button>
                            </>
                          ) : order.status === "preparing" ? (
                            <Button 
                              className="h-14 bg-cyan-500 hover:bg-cyan-600 text-black font-black text-xs uppercase rounded-2xl shadow-lg transition-transform active:scale-95 col-span-2"
                              onClick={() => updateOrderStatus(order.id, "serving")}
                            >
                              <Truck className="w-5 h-5 mr-2" /> Hoàn tất & Giao đồ
                            </Button>
                          ) : (
                            <Button 
                              className="h-14 bg-green-500 hover:bg-green-600 font-black text-xs uppercase rounded-2xl shadow-lg transition-transform active:scale-95 col-span-2"
                              onClick={() => updateOrderStatus(order.id, "completed")}
                            >
                              <Check className="w-5 h-5 mr-2" /> Đã mang tới khách
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-full bg-secondary/5">
            <div className="p-4 space-y-4 pb-32">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground flex items-center gap-2">
                <History className="w-6 h-6" /> Lịch sử
              </h2>
              {completedOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <BarChart3 className="w-11 h-11" />
                  </div>
                  <h3>Chưa có lịch sử bán hàng hôm nay</h3>
                  <p>Các đơn đã giao sẽ được lưu tại đây để bạn kiểm tra doanh thu nhanh.</p>
                  <Button variant="secondary" className="h-11 px-5 rounded-xl bg-secondary/70 border border-white/8 font-semibold">
                    <BarChart3 className="w-4 h-4 mr-2" /> Xem báo cáo
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {completedOrders.map((order, index) => (
                    <motion.button
                      key={order.id}
                      type="button"
                      className="block w-full text-left"
                      onClick={() => setSelectedHistoryOrder(order)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.15) }}
                      whileTap={{ scale: 0.985 }}
                    >
                      <Card className="bg-card/65 border-white/8 rounded-xl py-0 gap-0 hover:border-primary/25 hover:bg-card/85 transition-colors">
                        <CardContent className="p-4 flex justify-between items-center gap-4">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-primary">{order.machineId}</span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {order.time} • {order.items.reduce((sum, item) => sum + item.quantity, 0)} món
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 mt-1">
                              Bấm để xem lại chi tiết
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-sm">{order.total.toLocaleString("vi-VN")}đ</p>
                            <Badge className="bg-green-500/16 text-green-400 border-none text-[9px] h-5 font-semibold">Đã giao</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MACHINE SELECTION DRAWER - GRID & SEARCH */}
      <Sheet open={isMachineGridOpen} onOpenChange={setIsMachineGridOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="h-[80vh] rounded-t-[2.5rem] border-t-primary/50 glass p-0 flex flex-col bg-card">
          <SheetHeader className="px-8 py-6 border-b border-border/50 shrink-0">
            <SheetTitle className="text-2xl font-black tracking-tighter uppercase neon-text mb-4">Chọn máy phục vụ</SheetTitle>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nhập số máy (ví dụ: 12)..."
                className="pl-10 h-12 bg-secondary/30 border-primary/20 rounded-2xl focus-visible:ring-primary"
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                autoFocus
              />
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-5 gap-3 pb-8">
              {filteredMachines.map((m) => {
                const status = machineStatuses[m.id] || "empty";
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMachineId(m.id);
                      setIsMachineGridOpen(false);
                      setMachineSearch("");
                    }}
                    className={cn(
                      "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative border-2 active:scale-90",
                      selectedMachineId === m.id && "border-primary bg-primary/20 scale-105 z-10 shadow-glow",
                      m.isOffline ? "bg-muted/10 border-transparent text-muted-foreground opacity-30" : 
                      status === "empty" ? "bg-secondary/30 border-border/20 text-muted-foreground" :
                      status === "pending" ? "bg-cyan-500/10 border-cyan-500 text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" :
                      status === "preparing" ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]" :
                      "bg-primary/10 border-primary text-primary"
                    )}
                  >
                    <span className="text-[10px] font-bold opacity-50 leading-none mb-1">MÁY</span>
                    <span className="text-xl font-black tracking-tighter leading-none">{m.number}</span>
                    
                    {status !== "empty" && !m.isOffline && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* HISTORY DETAIL SHEET */}
      <Sheet open={!!selectedHistoryOrder} onOpenChange={(open) => !open && setSelectedHistoryOrder(null)}>
        <SheetContent side="bottom" showCloseButton={false} className="h-[72vh] rounded-t-[2rem] border-t-primary/35 p-0 overflow-hidden flex flex-col bg-card">
          {selectedHistoryOrder && (
            <>
              <SheetHeader className="px-6 py-5 border-b border-border/50 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SheetTitle className="text-2xl font-bold tracking-tight text-foreground">Chi tiết đơn</SheetTitle>
                    <p className="text-xs font-medium text-muted-foreground mt-1">
                      {selectedHistoryOrder.machineId} • {selectedHistoryOrder.time} • {new Date(selectedHistoryOrder.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedHistoryOrder(null)} className="rounded-full bg-secondary/50 h-10 w-10">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 px-6 py-5">
                <div className="space-y-3 pb-6">
                  {selectedHistoryOrder.items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/20 border border-white/8">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                        {item.product.category === "THỨC UỐNG" ? "🥤" : "🍜"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          x{item.quantity} • {item.product.price.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {(item.product.price * item.quantity).toLocaleString("vi-VN")}đ
                        </span>
                        {item.product.recipe && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-secondary/45 text-primary"
                            onClick={() => setRecipeProduct(item.product)}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <SheetFooter className="p-6 border-t border-border/50 bg-secondary/10 shrink-0">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tổng tiền</span>
                  <span className="text-2xl font-bold text-primary">{selectedHistoryOrder.total.toLocaleString("vi-VN")}đ</span>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* RECIPE BOTTOM SHEET */}
      <Sheet open={!!recipeProduct} onOpenChange={(open) => !open && setRecipeProduct(null)}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-[2.5rem] border-t-primary/50 glass p-0 overflow-hidden">
          {recipeProduct && (
            <div className="p-8 pb-12">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8 opacity-50" />
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter leading-none mb-2">{recipeProduct.name}</h2>
                  <Badge variant="secondary" className="font-bold text-primary">{recipeProduct.category}</Badge>
                </div>
                <span className="text-2xl font-black text-primary">{recipeProduct.price.toLocaleString("vi-VN")}đ</span>
              </div>
              
              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Hướng dẫn chế biến</p>
                {recipeProduct.recipe ? (
                  <div className="grid gap-3">
                    {recipeProduct.recipe.map((step, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/30 border border-white/5">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xs">
                          {i + 1}
                        </div>
                        <span className="text-sm font-bold">{step}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-secondary/20 border border-dashed border-border/50 text-center">
                    <p className="text-muted-foreground text-sm italic">Sản phẩm này không yêu cầu chế biến.</p>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-16 rounded-2xl font-black text-lg gaming-gradient shadow-neon"
                onClick={() => {
                  addToCart(recipeProduct);
                  setRecipeProduct(null);
                }}
              >
                THÊM VÀO GIỎ - {recipeProduct.price.toLocaleString("vi-VN")}đ
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* CART SHEET */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="h-[85vh] rounded-t-[2.5rem] border-t-primary/50 p-0 overflow-hidden flex flex-col bg-card">
          <SheetHeader className="px-8 py-6 border-b border-border/50 shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <SheetTitle className="text-3xl font-black tracking-tighter uppercase neon-text">Giỏ hàng</SheetTitle>
                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mt-1">Đang phục vụ {selectedMachineId}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="rounded-full bg-secondary/50 h-10 w-10">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-8 py-6">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                  <ShoppingCart className="w-16 h-16 mb-6" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Trống rỗng</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <motion.div
                      key={item.product.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-4 rounded-3xl bg-secondary/20 border border-border/50"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-black text-sm leading-tight tracking-tight truncate">{item.product.name}</h4>
                        <p className="text-primary font-black text-xs mt-1">
                          {item.product.price.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-background rounded-2xl border border-border/50 p-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-secondary/50 rounded-xl font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-secondary/50 rounded-xl font-bold"
                          >
                            +
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive/50"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          <SheetFooter className="p-8 border-t border-border/50 bg-secondary/10 flex-col gap-6 shrink-0">
            <div className="flex justify-between items-center w-full px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Tổng tiền</span>
              <span className="text-3xl font-black text-primary tracking-tighter">{totalAmount.toLocaleString("vi-VN")}đ</span>
            </div>
            <Button
              className="w-full h-16 text-lg font-black uppercase tracking-widest gaming-gradient shadow-neon active:scale-95 transition-transform"
              disabled={cart.length === 0}
              onClick={sendOrder}
            >
              GỬI ORDER
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* BOTTOM NAVIGATION TABS */}
      <div className="absolute bottom-0 left-0 right-0 h-20 glass border-t border-white/6 flex items-center justify-around px-4 z-30 rounded-t-3xl">
        <button 
          onClick={() => setActiveTab("menu")}
          className={cn(
            "nav-item",
            activeTab === "menu" ? "nav-item-active" : "text-[#7B8295]"
          )}
        >
          <span className="nav-icon-wrap"><Plus className="w-5 h-5 stroke-[2.5]" /></span>
          <span className="nav-label">Thực đơn</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("preparing")}
          className={cn(
            "nav-item relative",
            activeTab === "preparing" ? "nav-item-active" : "text-[#7B8295]"
          )}
        >
          <span className="nav-icon-wrap"><ChefHat className="w-5 h-5 stroke-[2.5]" /></span>
          <span className="nav-label">Đang làm</span>
          {preparingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-background shadow-lg animate-bounce">
              {preparingCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("history")}
          className={cn(
            "nav-item",
            activeTab === "history" ? "nav-item-active" : "text-[#7B8295]"
          )}
        >
          <span className="nav-icon-wrap"><History className="w-5 h-5 stroke-[2.5]" /></span>
          <span className="nav-label">Lịch sử</span>
        </button>
      </div>
    </div>
  );
}
