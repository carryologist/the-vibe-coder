import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllPosts } from '../src/lib/posts';

// Since we are running this in a script, we might need to handle the TS compilation 
// or just use ts-node. But for now, let's try to see if we can run it with ts-node.

/**
 * NOTE: This script is intended to be run with ts-node or after compilation.
 * For this environment, I'll try to use a simple approach.
 */

async function generateIndex() {
  const posts = getAllPosts();
  
  const index = posts.map(post => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    tags: post.tags,
    // We only want a snippet of content to keep the index small
    content: post.content.substring(0, 1000), 
  }));

  const outputPath = path.join(process.cwd(), 'public', 'search-index.json');
  
  // Ensure public directory exists
  if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
    fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
  console.log(`Search index generated at ${outputPath} with ${index.length} posts.`);
}

generateIndex().catch(err => {
  console.error(err);
  process.exit(1);
});
