/* eslint-disable no-console */
import { PrismaClient, type Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Prices are in tiyin (UZS minor units): 249_000_00 === 249 000 so'm. */
const SUM = (amount: number): number => amount * 100;

const COLORS = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#F5F5F5' },
  { name: 'Beige', hex: '#D9C7B0' },
  { name: 'Navy', hex: '#1F2A44' },
  { name: 'Olive', hex: '#6B705C' },
  { name: 'Burgundy', hex: '#6E1423' },
];

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

function pick<T>(items: T[], index: number): T {
  return items[index % items.length] as T;
}

function imageFor(seed: string, index: number): string {
  // Deterministic placeholder images so a reseed does not shuffle the catalog.
  return `https://picsum.photos/seed/${seed}-${index}/900/1200`;
}

async function main(): Promise<void> {
  console.log('Seeding Suman database…');

  // --- Clean slate --------------------------------------------------------
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  // --- Users --------------------------------------------------------------
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const userPassword = await bcrypt.hash('User1234!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@suman.uz',
      phone: '+998901234567',
      passwordHash: adminPassword,
      firstName: 'Suman',
      lastName: 'Admin',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@suman.uz',
      phone: '+998901112233',
      passwordHash: userPassword,
      firstName: 'Dilnoza',
      lastName: 'Karimova',
      isVerified: true,
      addresses: {
        create: {
          fullName: 'Dilnoza Karimova',
          phone: '+998901112233',
          region: 'Toshkent shahri',
          city: 'Chilonzor',
          street: 'Bunyodkor ko`chasi 12',
          apartment: '45',
          postalCode: '100115',
          isDefault: true,
        },
      },
    },
  });

  // --- Categories ---------------------------------------------------------
  const women = await prisma.category.create({
    data: { name: 'Women', slug: 'women', gender: 'WOMEN', sortOrder: 1 },
  });
  const men = await prisma.category.create({
    data: { name: 'Men', slug: 'men', gender: 'MEN', sortOrder: 2 },
  });

  const subcategories = await Promise.all([
    prisma.category.create({
      data: { name: 'Dresses', slug: 'women-dresses', gender: 'WOMEN', parentId: women.id, sortOrder: 1 },
    }),
    prisma.category.create({
      data: { name: 'Blouses', slug: 'women-blouses', gender: 'WOMEN', parentId: women.id, sortOrder: 2 },
    }),
    prisma.category.create({
      data: { name: 'Outerwear', slug: 'women-outerwear', gender: 'WOMEN', parentId: women.id, sortOrder: 3 },
    }),
    prisma.category.create({
      data: { name: 'Shirts', slug: 'men-shirts', gender: 'MEN', parentId: men.id, sortOrder: 1 },
    }),
    prisma.category.create({
      data: { name: 'T-Shirts', slug: 'men-tshirts', gender: 'MEN', parentId: men.id, sortOrder: 2 },
    }),
    prisma.category.create({
      data: { name: 'Jackets', slug: 'men-jackets', gender: 'MEN', parentId: men.id, sortOrder: 3 },
    }),
  ]);

  // --- Products -----------------------------------------------------------
  const catalog: Array<{ title: string; category: number; gender: Gender; price: number; oldPrice?: number; brand: string }> = [
    { title: 'Silk Midi Dress', category: 0, gender: 'WOMEN', price: SUM(749_000), oldPrice: SUM(899_000), brand: 'Suman Atelier' },
    { title: 'Linen Wrap Dress', category: 0, gender: 'WOMEN', price: SUM(529_000), brand: 'Suman Atelier' },
    { title: 'Pleated Maxi Dress', category: 0, gender: 'WOMEN', price: SUM(689_000), oldPrice: SUM(790_000), brand: 'Nova' },
    { title: 'Cotton Poplin Blouse', category: 1, gender: 'WOMEN', price: SUM(319_000), brand: 'Nova' },
    { title: 'Satin Tie-Neck Blouse', category: 1, gender: 'WOMEN', price: SUM(389_000), oldPrice: SUM(455_000), brand: 'Suman Atelier' },
    { title: 'Wool Blend Coat', category: 2, gender: 'WOMEN', price: SUM(1_290_000), oldPrice: SUM(1_590_000), brand: 'Terra' },
    { title: 'Quilted Puffer Jacket', category: 2, gender: 'WOMEN', price: SUM(870_000), brand: 'Terra' },
    { title: 'Oxford Cotton Shirt', category: 3, gender: 'MEN', price: SUM(349_000), brand: 'Suman Studio' },
    { title: 'Slim Fit Linen Shirt', category: 3, gender: 'MEN', price: SUM(419_000), oldPrice: SUM(499_000), brand: 'Suman Studio' },
    { title: 'Heavyweight Cotton Tee', category: 4, gender: 'MEN', price: SUM(179_000), brand: 'Basis' },
    { title: 'Oversized Graphic Tee', category: 4, gender: 'MEN', price: SUM(219_000), oldPrice: SUM(259_000), brand: 'Basis' },
    { title: 'Suede Bomber Jacket', category: 5, gender: 'MEN', price: SUM(1_450_000), brand: 'Terra' },
    { title: 'Water-Repellent Parka', category: 5, gender: 'MEN', price: SUM(990_000), oldPrice: SUM(1_190_000), brand: 'Terra' },
    { title: 'Merino Wool Cardigan', category: 2, gender: 'UNISEX', price: SUM(640_000), brand: 'Nova' },
  ];

  for (const [index, entry] of catalog.entries()) {
    const category = subcategories[entry.category]!;
    const slug = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const colorChoices = [pick(COLORS, index), pick(COLORS, index + 2), pick(COLORS, index + 4)];
    const uniqueColors = [...new Map(colorChoices.map((c) => [c.name, c])).values()];

    await prisma.product.create({
      data: {
        title: entry.title,
        slug,
        description: `${entry.title} — crafted from premium materials with a considered, minimal silhouette. Designed in Tashkent, made to be worn every day and to last well beyond a single season.`,
        brand: entry.brand,
        gender: entry.gender,
        categoryId: category.id,
        price: entry.price,
        oldPrice: entry.oldPrice ?? null,
        isFeatured: index % 4 === 0,
        sold: (index * 17) % 240,
        images: {
          create: [0, 1, 2].map((imageIndex) => ({
            url: imageFor(slug, imageIndex),
            alt: `${entry.title} — view ${imageIndex + 1}`,
            sortOrder: imageIndex,
          })),
        },
        variants: {
          create: uniqueColors.flatMap((color) =>
            APPAREL_SIZES.map((size) => ({
              color: color.name,
              colorHex: color.hex,
              size,
              sku: `${slug.slice(0, 14).toUpperCase()}-${color.name.slice(0, 3).toUpperCase()}-${size}`,
              // A couple of deliberately empty variants so the UI's
              // out-of-stock state is exercised by the seed data.
              stock: size === 'XS' && color.name === 'Beige' ? 0 : 4 + ((index + size.length) % 20),
            })),
          ),
        },
      },
    });
  }

  // --- Banners ------------------------------------------------------------
  await prisma.banner.createMany({
    data: [
      {
        title: 'Autumn / Winter 25',
        subtitle: 'Considered layers for colder days',
        imageUrl: imageFor('banner-aw25', 1).replace('900/1200', '1920/720'),
        mobileImageUrl: imageFor('banner-aw25', 1).replace('900/1200', '780/900'),
        link: '/women',
        sortOrder: 1,
      },
      {
        title: 'The Essentials Edit',
        subtitle: 'Everyday pieces, permanently in rotation',
        imageUrl: imageFor('banner-essentials', 2).replace('900/1200', '1920/720'),
        mobileImageUrl: imageFor('banner-essentials', 2).replace('900/1200', '780/900'),
        link: '/men',
        sortOrder: 2,
      },
      {
        title: 'Up to 30% off outerwear',
        subtitle: 'Selected coats and jackets',
        imageUrl: imageFor('banner-sale', 3).replace('900/1200', '1920/720'),
        link: '/?sort=price_asc',
        sortOrder: 3,
      },
    ],
  });

  console.log('Seed complete.');
  console.log(`  Admin    : admin@suman.uz / Admin123!    (${admin.id})`);
  console.log(`  Customer : customer@suman.uz / User1234! (${customer.id})`);
  console.log(`  Products : ${catalog.length}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
