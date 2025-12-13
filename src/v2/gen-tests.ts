// The purpose of this file is to generate the tests using the generated stories, journeys and index record

export async function genTests() {
    console.log('Gen Tests');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genTests().catch(console.error);
}

