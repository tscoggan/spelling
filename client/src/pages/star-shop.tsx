import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Home, Star, Minus, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserHeader } from "@/components/user-header";
import shopBackground from "@assets/Star shop - landscape (no title)_1764452486174.png";
import shopTitle from "@assets/Star Shop title_1764452486174.png";
import doOverImage from "@assets/Do Over (1 Word) item_1764449029422.png";
import secondChanceImage from "@assets/2nd Chance (All Mistakes) item_1764449029422.png";
import { SHOP_ITEMS, ShopItem, ShopItemId } from "@shared/schema";

interface UserItem {
  id: number;
  userId: number;
  itemId: string;
  quantity: number;
}

interface ShopData {
  stars: number;
  inventory: UserItem[];
  catalog: Record<string, ShopItem>;
}

const ITEM_IMAGES: Record<ShopItemId, string> = {
  do_over: doOverImage,
  second_chance: secondChanceImage,
};

export default function StarShop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: ShopItemId; item: ShopItem } | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const { data: shopData, isLoading } = useQuery<ShopData>({
    queryKey: ["/api/user-items"],
    enabled: !!user,
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: ShopItemId; quantity: number }) => {
      const response = await apiRequest("POST", "/api/user-items/purchase", { itemId, quantity });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Purchase Successful!",
        description: `You now have ${data.newItemQuantity} ${selectedItem?.item.name}${data.newItemQuantity > 1 ? 's' : ''}!`,
      });
      setPurchaseDialogOpen(false);
      setSelectedItem(null);
      setPurchaseQuantity(1);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Could not complete purchase",
        variant: "destructive",
      });
    },
  });

  const getInventoryQuantity = (itemId: string): number => {
    if (!shopData?.inventory) return 0;
    const item = shopData.inventory.find(i => i.itemId === itemId);
    return item?.quantity || 0;
  };

  const handlePurchaseClick = (itemId: ShopItemId, item: ShopItem) => {
    setSelectedItem({ id: itemId, item });
    setPurchaseQuantity(1);
    setPurchaseDialogOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedItem) {
      purchaseMutation.mutate({ itemId: selectedItem.id, quantity: purchaseQuantity });
    }
  };

  const canAfford = (cost: number) => {
    return (shopData?.stars || 0) >= cost * purchaseQuantity;
  };

  const totalCost = selectedItem ? selectedItem.item.cost * purchaseQuantity : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 z-0">
        <img 
          src={shopBackground} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between p-2 relative z-20">
          <Button
            variant="default"
            onClick={() => setLocation("/")}
            className="bg-white/90 dark:bg-black/70 text-foreground hover:bg-white dark:hover:bg-black/80 shadow-lg"
            data-testid="button-home"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          
          <UserHeader />
        </header>

        <main className="flex-1 flex flex-col items-center pt-2 px-4">
          <motion.img
            src={shopTitle}
            alt="Star Shop"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-12 object-contain mb-3"
            data-testid="img-shop-title"
          />
          
          <div className="w-full max-w-md flex items-center justify-center mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-[#4A9FD4] border-4 border-[#3A7FAA] shadow-lg"
              data-testid="star-counter"
            >
              <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 drop-shadow-md" />
              <span 
                className="text-2xl font-bold text-white drop-shadow-md"
                data-testid="text-star-balance"
              >
                {shopData?.stars || 0}
              </span>
            </motion.div>
          </div>

          <div className="w-full max-w-md flex-1 overflow-y-auto pb-8 space-y-4">
            {Object.entries(SHOP_ITEMS).map(([itemId, item], index) => {
              const inventoryQty = getInventoryQuantity(itemId);
              const affordable = (shopData?.stars || 0) >= item.cost;
              const itemImage = ITEM_IMAGES[itemId as ShopItemId];
              
              return (
                <motion.div
                  key={itemId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="flex items-stretch gap-3 p-3 rounded-xl bg-white/90 dark:bg-black/70 backdrop-blur-sm shadow-lg border-2 border-amber-400/50"
                  data-testid={`card-shop-item-${itemId}`}
                >
                  <div className="shrink-0 flex items-center">
                    <img 
                      src={itemImage} 
                      alt={item.name}
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-foreground leading-tight">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-lg">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-sm text-amber-700 dark:text-amber-300">
                            {item.cost}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Owned: {inventoryQty}
                      </Badge>
                      
                      <Button
                        size="sm"
                        disabled={!affordable}
                        onClick={() => handlePurchaseClick(itemId as ShopItemId, item)}
                        className="ml-auto"
                        data-testid={`button-buy-${itemId}`}
                      >
                        {affordable ? 'Buy' : 'Need More Stars'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </main>
      </div>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Purchase {selectedItem?.item.name}</DialogTitle>
            <DialogDescription className="text-center">
              {selectedItem?.item.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="flex justify-center py-2">
              <img 
                src={ITEM_IMAGES[selectedItem.id]} 
                alt={selectedItem.item.name}
                className="w-24 h-24 object-contain"
              />
            </div>
          )}
          
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                disabled={purchaseQuantity <= 1}
                data-testid="button-decrease-quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center" data-testid="text-purchase-quantity">
                {purchaseQuantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPurchaseQuantity(purchaseQuantity + 1)}
                disabled={!canAfford(selectedItem?.item.cost || 0)}
                data-testid="button-increase-quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-lg">
              <span>Total:</span>
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <span className="font-bold" data-testid="text-total-cost">{totalCost}</span>
            </div>
            
            {!canAfford(selectedItem?.item.cost || 0) && (
              <p className="text-center text-destructive text-sm">
                You need {totalCost - (shopData?.stars || 0)} more stars
              </p>
            )}
          </div>
          
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button 
              variant="outline" 
              onClick={() => setPurchaseDialogOpen(false)}
              data-testid="button-cancel-purchase"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              disabled={!canAfford(selectedItem?.item.cost || 0) || purchaseMutation.isPending}
              data-testid="button-confirm-purchase"
            >
              {purchaseMutation.isPending ? 'Purchasing...' : 'Buy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
