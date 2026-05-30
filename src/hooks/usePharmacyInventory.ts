import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/config";

export type PharmacyInventoryDrug = {
  id: string;
  label: string;
  value: string;
  category: string;
  route: "Topical" | "Oral";
};

/** Active pharmacy catalog items for prescription quick-pick chips. */
export function usePharmacyInventory() {
  const [inventoryDrugs, setInventoryDrugs] = useState<PharmacyInventoryDrug[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      setLoadingInventory(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setInventoryDrugs([]);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setInventoryDrugs([]);
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        setInventoryDrugs([]);
        return;
      }
      const active = data
        .filter((item: { isActive?: boolean }) => item.isActive !== false)
        .sort((a: { category: string; name: string }, b: { category: string; name: string }) => {
          const cat = a.category.localeCompare(b.category);
          return cat !== 0 ? cat : a.name.localeCompare(b.name);
        });
      setInventoryDrugs(
        active.map((item: { id: string; name: string; category: string; route?: string }) => ({
          id: item.id,
          label: item.name,
          value: item.name,
          category: item.category,
          route: item.route?.toLowerCase() === "oral" ? "Oral" : "Topical",
        }))
      );
    } catch (e) {
      console.error("Failed to load pharmacy inventory:", e);
      setInventoryDrugs([]);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    const onInventoryUpdated = () => fetchInventory();
    window.addEventListener("inventoryUpdated", onInventoryUpdated);
    return () => window.removeEventListener("inventoryUpdated", onInventoryUpdated);
  }, [fetchInventory]);

  return { inventoryDrugs, loadingInventory, refetchInventory: fetchInventory };
}
