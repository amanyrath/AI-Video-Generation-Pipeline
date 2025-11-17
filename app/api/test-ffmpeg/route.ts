/**
 * Test endpoint to verify FFmpeg works on Vercel
 * 
 * DELETE THIS FILE BEFORE FINAL DEPLOYMENT
 * Or protect it with authentication
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Try to get FFmpeg version
    let ffmpegPath = 'ffmpeg';
    
    // On Vercel, try to use system FFmpeg first
    // If that fails, try the npm package path
    try {
      const { stdout } = await execAsync(`${ffmpegPath} -version`);
      return Response.json({
        success: true,
        message: 'FFmpeg is working!',
        version: stdout.split('\n')[0],
        path: ffmpegPath,
      });
    } catch (error) {
      // Try npm package path (optional - only if package is installed)
      // Note: This requires @ffmpeg-installer/ffmpeg to be installed
      // If not installed, this will fail gracefully
      try {
        // Note: @ffmpeg-installer/ffmpeg is optional and not currently installed
        // This fallback is here for future use if needed
        throw new Error('@ffmpeg-installer/ffmpeg package not installed');
      } catch (packageError) {
        return Response.json({
          success: false,
          error: 'FFmpeg not found',
          details: {
            systemError: String(error),
            packageError: String(packageError),
          },
          suggestion: 'Install @ffmpeg-installer/ffmpeg or configure FFmpeg in Vercel',
        }, { status: 500 });
      }
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: 'Failed to test FFmpeg',
      details: String(error),
    }, { status: 500 });
  }
}

