// the purpose of this file is to take an index record and generate the full journey file

export async function genJourneys() {
    console.log('Gen Journeys');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genJourneys().catch(console.error);
}

