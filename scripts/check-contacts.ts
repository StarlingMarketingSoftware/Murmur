import prisma from '../src/lib/prisma';

async function checkContacts() {
    try {
        // Count total contacts
        const totalContacts = await prisma.contact.count();
        console.log(`Total contacts in database: ${totalContacts}`);
        
        // Get a sample of contacts
        const sampleContacts = await prisma.contact.findMany({
            take: 5,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                company: true,
                city: true,
                state: true,
                country: true,
                emailValidationStatus: true,
                hasVectorEmbedding: true,
            }
        });
        
        console.log('\nSample contacts:');
        sampleContacts.forEach((contact, index) => {
            console.log(`\n${index + 1}. Contact ID: ${contact.id}`);
            console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
            console.log(`   Email: ${contact.email}`);
            console.log(`   Company: ${contact.company}`);
            console.log(`   Location: ${contact.city}, ${contact.state}, ${contact.country}`);
            console.log(`   Email Status: ${contact.emailValidationStatus}`);
            console.log(`   Has Vector Embedding: ${contact.hasVectorEmbedding}`);
        });
        
        // Check contacts by state (Pennsylvania)
        const pennsylvaniaContacts = await prisma.contact.count({
            where: {
                state: {
                    contains: 'Pennsylvania',
                    mode: 'insensitive'
                }
            }
        });
        console.log(`\nContacts in Pennsylvania: ${pennsylvaniaContacts}`);
        
        // Check contacts with "music" in various fields
        const musicRelatedContacts = await prisma.contact.count({
            where: {
                OR: [
                    { company: { contains: 'music', mode: 'insensitive' } },
                    { title: { contains: 'music', mode: 'insensitive' } },
                    { headline: { contains: 'music', mode: 'insensitive' } },
                    { metadata: { contains: 'music', mode: 'insensitive' } },
                ]
            }
        });
        console.log(`Contacts with "music" in their data: ${musicRelatedContacts}`);
        
        // Check contacts with "venue" in various fields
        const venueRelatedContacts = await prisma.contact.count({
            where: {
                OR: [
                    { company: { contains: 'venue', mode: 'insensitive' } },
                    { title: { contains: 'venue', mode: 'insensitive' } },
                    { headline: { contains: 'venue', mode: 'insensitive' } },
                    { metadata: { contains: 'venue', mode: 'insensitive' } },
                ]
            }
        });
        console.log(`Contacts with "venue" in their data: ${venueRelatedContacts}`);
        
        // Check email validation statuses
        const validEmails = await prisma.contact.count({
            where: { emailValidationStatus: 'valid' }
        });
        const invalidEmails = await prisma.contact.count({
            where: { emailValidationStatus: 'invalid' }
        });
        const unknownEmails = await prisma.contact.count({
            where: { emailValidationStatus: null }
        });
        
        console.log(`\nEmail validation status:`);
        console.log(`  Valid: ${validEmails}`);
        console.log(`  Invalid: ${invalidEmails}`);
        console.log(`  Unknown/null: ${unknownEmails}`);
        
    } catch (error) {
        console.error('Error checking contacts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkContacts();
