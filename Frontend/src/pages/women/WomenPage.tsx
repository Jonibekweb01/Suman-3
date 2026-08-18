import { CatalogView } from '../../widgets/catalog/CatalogView';

/**
 * `gender` is pinned as a base filter, so it survives every URL change and
 * cannot be overridden by a query param — `/women?gender=MEN` still shows
 * womenswear.
 */
export default function WomenPage() {
  return (
    <CatalogView
      gender="WOMEN"
      title="Women"
      description="Dresses, blouses and outerwear cut for everyday wear. Filter by size, colour and price to narrow the edit."
    />
  );
}
