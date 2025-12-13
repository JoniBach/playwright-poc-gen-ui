// The purpose of this file is to take the index and the journey files and generate the user stories

export async function genStories() {
    console.log('Gen Stories');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genStories().catch(console.error);
}

