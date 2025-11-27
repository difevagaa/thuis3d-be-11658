import { useTranslatedContent } from "@/hooks/useTranslatedContent";

interface TranslatedProductProps {
  product: any;
  children: (translatedProduct: any) => React.ReactNode;
}

export function TranslatedProduct({ product, children }: TranslatedProductProps) {
  const { content, loading } = useTranslatedContent(
    'products',
    product.id,
    ['name', 'description'],
    product
  );

  if (loading) {
    return children(product);
  }

  const translatedProduct = {
    ...product,
    name: content.name || product.name,
    description: content.description || product.description,
  };

  return children(translatedProduct);
}
