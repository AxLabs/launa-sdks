export type DemoProduct = {
  id: string;
  title: string;
  price: string;
  handle?: string;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "1001", title: "Sample product", price: "9.99", handle: "sample-product" },
  { id: "1002", title: "Premium API access", price: "0.50", handle: "premium-api-access" },
];

export function listProducts(devMode: boolean, shop?: string, _accessToken?: string): DemoProduct[] {
  if (devMode || !shop) {
    return DEMO_PRODUCTS;
  }
  return DEMO_PRODUCTS;
}
