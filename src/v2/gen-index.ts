// The purpose of this file is to run the initial generation stage of building and creating the index file for the journey generator

export async function genIndex() {
    console.log('Gen Index');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genIndex().catch(console.error);
}
