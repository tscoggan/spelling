import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Star, ShoppingCart, Package, Minus, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { UserHeader } from "@/components/user-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";
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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="hidden md:block absolute inset-0">
          <img 
            src={rainbowBackgroundLandscape} 
            alt="" 
            className="w-full h-full object-cover object-[center_top]"
          />
        </div>
        
        <div className="md:hidden absolute inset-0">
          <img 
            src={rainbowBackgroundPortrait} 
            alt="" 
            className="w-full h-full object-cover object-[center_top]"
          />
        </div>
        
        <div className="absolute inset-0 bg-white/5 dark:bg-black/50" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <UserHeader />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-6"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                className="shrink-0 bg-white/80 dark:bg-black/50 backdrop-blur-sm"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Star Shop
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="mb-6 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/30">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Stars</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-star-balance">
                        {shopData?.stars || 0}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    <Package className="h-4 w-4 mr-1" />
                    {shopData?.inventory?.reduce((sum, item) => sum + item.quantity, 0) || 0} items
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>

            <h2 className="text-xl font-semibold mb-4 text-foreground">Power-Ups</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(SHOP_ITEMS).map(([itemId, item], index) => {
                const inventoryQty = getInventoryQuantity(itemId);
                const affordable = (shopData?.stars || 0) >= item.cost;
                
                return (
                  <motion.div
                    key={itemId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <Card 
                      className={`relative overflow-hidden transition-all ${
                        affordable ? 'hover-elevate cursor-pointer' : 'opacity-60'
                      }`}
                      data-testid={`card-shop-item-${itemId}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {item.description}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              variant="secondary" 
                              className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            >
                              <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                              {item.cost}
                            </Badge>
                            {inventoryQty > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Owned: {inventoryQty}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <Button
                          className="w-full"
                          disabled={!affordable}
                          onClick={() => handlePurchaseClick(itemId as ShopItemId, item)}
                          data-testid={`button-buy-${itemId}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {affordable ? 'Buy Now' : 'Not Enough Stars'}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <h2 className="text-xl font-semibold mb-4 text-foreground">Your Inventory</h2>
              <Card>
                <CardContent className="p-4">
                  {shopData?.inventory && shopData.inventory.length > 0 ? (
                    <div className="space-y-3">
                      {shopData.inventory.filter(item => item.quantity > 0).map((inventoryItem) => {
                        const shopItem = SHOP_ITEMS[inventoryItem.itemId as ShopItemId];
                        if (!shopItem) return null;
                        
                        return (
                          <div 
                            key={inventoryItem.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            data-testid={`inventory-item-${inventoryItem.itemId}`}
                          >
                            <div>
                              <p className="font-medium">{shopItem.name}</p>
                              <p className="text-sm text-muted-foreground">{shopItem.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-lg px-3 py-1">
                              x{inventoryItem.quantity}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No items yet</p>
                      <p className="text-sm">Purchase power-ups above to use in games!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase {selectedItem?.item.name}</DialogTitle>
            <DialogDescription>
              {selectedItem?.item.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
          
          <DialogFooter>
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
              {purchaseMutation.isPending ? 'Purchasing...' : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
