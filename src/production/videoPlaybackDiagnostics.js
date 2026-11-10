// Browser MediaError codes from the HTMLMediaElement specification.
// No private signed URLs, media paths, session tokens or metadata in UI errors.
export function videoPlaybackErrorMessage(code){
 switch(code){
  case 1:return 'Playback was interrupted. Select Retry secure playback.';
  case 2:return 'The video could not be downloaded completely. Check the connection or refresh the protected link.';
  case 3:return 'Chrome could not decode this video. Export it as MP4 (H.264 video + AAC audio) instead of H.265/HEVC, then upload that compatible copy.';
  case 4:return 'This video format or source cannot be played here. MP4 is a container; use H.264 video with AAC audio, and retry the protected link.';
  default:return 'The video could not start. Retry secure playback; if it still fails, re-encode the MP4 with H.264 video and AAC audio.';
 }
}
