const { PrismaClient } = require('@prisma/client');

async function checkRefs() {
  const prisma = new PrismaClient();

  try {
    // Get the most recent project
    const project = await prisma.project.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        scenes: {
          orderBy: { sceneNumber: 'asc' }
        }
      }
    });

    if (!project) {
      console.log('No projects found');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Project: ${project.name} (${project.id})`);
    console.log(`Created: ${project.createdAt}`);
    console.log('='.repeat(80) + '\n');

    for (const scene of project.scenes) {
      console.log(`Scene ${scene.sceneNumber}: ${scene.sceneSummary?.substring(0, 60)}...`);

      let refs = [];
      if (scene.referenceImageUrls) {
        try {
          refs = JSON.parse(scene.referenceImageUrls);
        } catch {
          // If it's not JSON, it might be a single URL or comma-separated
          refs = [scene.referenceImageUrls];
        }
      }

      console.log(`  Reference Images: ${refs.length}`);
      refs.forEach((url, idx) => {
        const urlStr = String(url);
        console.log(`    [${idx}]: ${urlStr.substring(0, 80)}${urlStr.length > 80 ? '...' : ''}`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRefs();
