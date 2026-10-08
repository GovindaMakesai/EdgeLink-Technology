import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.upsert({
    where: { id: 'demo-client-edgelink' },
    update: {
      name: 'Public demo site',
      email: 'demo-site@edgelink.local',
      phone: '+910000000000',
      isDemo: true,
    },
    create: {
      id: 'demo-client-edgelink',
      name: 'Public demo site',
      email: 'demo-site@edgelink.local',
      phone: '+910000000000',
      isDemo: true,
    },
  });

  await prisma.website.upsert({
    where: {
      clientId_url: {
        clientId: client.id,
        url: 'https://www.wikipedia.org/',
      },
    },
    update: {
      businessType: 'Encyclopedia',
      city: 'Global',
      state: 'Worldwide',
      targetKeyword: 'wikipedia',
    },
    create: {
      clientId: client.id,
      url: 'https://www.wikipedia.org/',
      domain: 'wikipedia.org',
      businessType: 'Encyclopedia',
      city: 'Global',
      state: 'Worldwide',
      targetKeyword: 'wikipedia',
    },
  });

  console.log('Seeded demo client Public demo site');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
