import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.upsert({
    where: { id: 'demo-client-edgelink' },
    update: {
      name: 'Example Dental Clinic',
      email: 'demo-clinic@edgelink.local',
      phone: '+910000000000',
      isDemo: true,
    },
    create: {
      id: 'demo-client-edgelink',
      name: 'Example Dental Clinic',
      email: 'demo-clinic@edgelink.local',
      phone: '+910000000000',
      isDemo: true,
    },
  });

  await prisma.website.upsert({
    where: {
      clientId_url: {
        clientId: client.id,
        url: 'https://example-dental-clinic.com/',
      },
    },
    update: {
      businessType: 'Dental Clinic',
      city: 'Pune',
      state: 'Maharashtra',
      targetKeyword: 'dental clinic pune',
    },
    create: {
      clientId: client.id,
      url: 'https://example-dental-clinic.com/',
      domain: 'example-dental-clinic.com',
      businessType: 'Dental Clinic',
      city: 'Pune',
      state: 'Maharashtra',
      targetKeyword: 'dental clinic pune',
    },
  });

  console.log('Seeded demo client Example Dental Clinic');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
