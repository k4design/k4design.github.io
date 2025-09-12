import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@apertureglobal.com' },
    update: {},
    create: {
      email: 'admin@apertureglobal.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  })

  console.log('Created admin user:', adminUser.email)

  // Create sample agents
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { slug: 'sarah-mitchell' },
      update: {},
      create: {
        slug: 'sarah-mitchell',
        name: 'Sarah Mitchell',
        email: 'sarah@apertureglobal.com',
        phone: '+1 (555) 123-4567',
        license: 'BRE #01234567',
        bio: 'With over 15 years of experience in luxury real estate, Sarah specializes in Beverly Hills and West Hollywood properties. Her attention to detail and personalized service have earned her a reputation as one of the top agents in Los Angeles.',
        portrait: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        specialties: JSON.stringify(['Luxury Homes', 'Beverly Hills', 'West Hollywood', 'New Construction']),
        markets: JSON.stringify(['Beverly Hills', 'West Hollywood', 'Bel Air', 'Brentwood']),
        featured: true,
        order: 1,
        socials: JSON.stringify({
          linkedin: 'https://linkedin.com/in/sarahmitchell',
          instagram: 'https://instagram.com/sarahmitchellre',
          twitter: 'https://twitter.com/sarahmitchellre',
        }),
      },
    }),
    prisma.agent.upsert({
      where: { slug: 'michael-rodriguez' },
      update: {},
      create: {
        slug: 'michael-rodriguez',
        name: 'Michael Rodriguez',
        email: 'michael@apertureglobal.com',
        phone: '+1 (555) 234-5678',
        license: 'BRE #02345678',
        bio: 'Michael brings a wealth of international experience to the Manhattan luxury market. Fluent in three languages, he specializes in high-end condos and penthouses in prime Manhattan locations.',
        portrait: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        specialties: JSON.stringify(['Manhattan Condos', 'Penthouses', 'International Clients', 'Investment Properties']),
        markets: JSON.stringify(['Manhattan', 'Brooklyn Heights', 'Tribeca', 'SoHo']),
        featured: true,
        order: 2,
        socials: JSON.stringify({
          linkedin: 'https://linkedin.com/in/michaelrodriguez',
          instagram: 'https://instagram.com/michaelrodriguezre',
        }),
      },
    }),
    prisma.agent.upsert({
      where: { slug: 'emma-thompson' },
      update: {},
      create: {
        slug: 'emma-thompson',
        name: 'Emma Thompson',
        email: 'emma@apertureglobal.com',
        phone: '+33 1 23 45 67 89',
        license: 'EU #987654321',
        bio: 'Based in Monaco, Emma specializes in luxury waterfront properties throughout the French Riviera. Her extensive network and local expertise make her the go-to agent for high-net-worth international clients.',
        portrait: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
        specialties: JSON.stringify(['Waterfront Properties', 'French Riviera', 'International Luxury', 'Yacht Access']),
        markets: JSON.stringify(['Monaco', 'Cannes', 'Nice', 'Saint-Tropez']),
        featured: true,
        order: 3,
        socials: JSON.stringify({
          linkedin: 'https://linkedin.com/in/emmathompson',
          instagram: 'https://instagram.com/emmathompsonre',
        }),
      },
    }),
  ])

  console.log('Created agents:', agents.map(a => a.name))

  // Create sample pages
  const pages = await Promise.all([
    prisma.page.upsert({
      where: { slug: 'home' },
      update: {},
      create: {
        slug: 'home',
        title: 'Aperture Global - Luxury Real Estate',
        content: JSON.stringify({
          hero: {
            title: 'Exceptional Properties, Extraordinary Lives',
            subtitle: 'Discover the world\'s most prestigious properties with Aperture Global\'s curated collection of luxury real estate.',
            backgroundImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&h=1080&fit=crop',
          },
          stats: [
            { label: 'Properties Sold', value: '$2.5B+' },
            { label: 'Happy Clients', value: '500+' },
            { label: 'Years Experience', value: '25+' },
            { label: 'Award Winning', value: '50+' },
          ],
        }),
        seoTitle: 'Aperture Global - Luxury Real Estate',
        seoDescription: 'Discover exceptional properties in the world\'s most prestigious locations with Aperture Global.',
        published: true,
      },
    }),
    prisma.page.upsert({
      where: { slug: 'about' },
      update: {},
      create: {
        slug: 'about',
        title: 'About Aperture Global',
        content: JSON.stringify({
          sections: [
            {
              title: 'Our Story',
              content: 'Founded in 1999, Aperture Global has been at the forefront of luxury real estate for over two decades. We specialize in connecting discerning clients with the world\'s most exceptional properties.',
            },
            {
              title: 'Our Mission',
              content: 'To provide unparalleled service and expertise in luxury real estate, ensuring every client finds their perfect property in the world\'s most prestigious locations.',
            },
          ],
        }),
        seoTitle: 'About Aperture Global - Luxury Real Estate Experts',
        seoDescription: 'Learn about Aperture Global\'s commitment to excellence in luxury real estate and our team of expert agents.',
        published: true,
      },
    }),
  ])

  console.log('Created pages:', pages.map(p => p.title))

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Database seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
