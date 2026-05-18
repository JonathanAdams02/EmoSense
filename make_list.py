import os
import json
import argparse

VIDEO_EXTENSIONS = {'.mp4'}

def make_video_list(folder, output):
    if not os.path.isdir(folder):
        print(f"Error: '{folder}' is not a valid directory.")
        return

    files = sorted([
        f for f in os.listdir(folder)
        if os.path.splitext(f)[1].lower() in VIDEO_EXTENSIONS
    ])

    if not files:
        print(f"No video files found in '{folder}'.")
        return

    with open(output, 'w') as f:
        json.dump(files, f, indent=2)

    print(f"Found {len(files)} video(s). Saved to '{output}'.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate video-list.json from a folder of videos.')
    parser.add_argument('folder', nargs='?', default='videos',
                        help='Path to the video folder (default: videos)')
    parser.add_argument('--output', default='video-list.json',
                        help='Output JSON filename (default: video-list.json)')
    args = parser.parse_args()

    make_video_list(args.folder, args.output)