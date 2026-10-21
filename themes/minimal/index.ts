import type { ThemeDefinition } from "../types";
import { CategorySection } from "./CategorySection";
import { FeaturedProducts } from "./FeaturedProducts";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Newsletter } from "./Newsletter";
import { ProductCard } from "./ProductCard";
import { ProductGrid } from "./ProductGrid";
import { Testimonials } from "./Testimonials";

export const minimal: ThemeDefinition = {
  slug: "minimal",
  tokens: { radius: "0.375rem", headingTransform: "none", headingTracking: "-0.01em", headingWeight: "700", pill: "9999px", listLayout: "sidebar" },
  Header,
  Hero,
  ProductGrid,
  ProductCard,
  CategorySection,
  FeaturedProducts,
  Testimonials,
  Newsletter,
  Footer,
};
