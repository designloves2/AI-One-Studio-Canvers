// Model files the canvas engines need, with their Hugging Face links (names must match for auto-detection).
export interface CatalogFile { folder: string; file: string; url: string }
export interface CatalogGroup { id: string; label: string; note?: string; files: CatalogFile[] }

const hf = (repo: string, p: string) => `https://huggingface.co/${repo}/resolve/main/${p}`;

export const CATALOG: CatalogGroup[] = [
  { id: 'qwen-edit', label: 'Qwen Image Edit 2511', files: [
    { folder: 'diffusion_models', file: 'qwen_image_edit_2511_fp8mixed.safetensors', url: hf('Comfy-Org/Qwen-Image-Edit_ComfyUI', 'split_files/diffusion_models/qwen_image_edit_2511_fp8mixed.safetensors') },
    { folder: 'text_encoders', file: 'qwen_2.5_vl_7b_fp8_scaled.safetensors', url: hf('Comfy-Org/Qwen-Image_ComfyUI', 'split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors') },
    { folder: 'vae', file: 'qwen_image_vae.safetensors', url: hf('Comfy-Org/Qwen-Image_ComfyUI', 'split_files/vae/qwen_image_vae.safetensors') },
  ] },
  { id: 'ltx25', label: 'LTX 2.5 (video + audio)', note: 'Needs the license accepted on huggingface.co/Lightricks/LTX-2.5. The latent upscaler comes from the same repo page.', files: [
    { folder: 'diffusion_models', file: 'ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors', url: hf('Lightricks/LTX-2.5', 'diffusion_models/ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors') },
    { folder: 'text_encoders', file: 'gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors', url: hf('Lightricks/LTX-2.5', 'text_encoders/gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors') },
    { folder: 'vae', file: 'ltx-2.5-video-vae-bf16.safetensors', url: hf('Lightricks/LTX-2.5', 'vae/ltx-2.5-video-vae-bf16.safetensors') },
    { folder: 'vae', file: 'ltx-2.5-audio-vae-bf16.safetensors', url: hf('Lightricks/LTX-2.5', 'vae/ltx-2.5-audio-vae-bf16.safetensors') },
  ] },
  { id: 'h3', label: 'MiniMax H3 — text / first-last frame', files: [
    { folder: 'diffusion_models', file: 'minimax_h3_fl2va_pruned_int8_convrot.safetensors', url: hf('Comfy-Org/MiniMax-H3', 'diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors') },
    { folder: 'text_encoders', file: 'qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors', url: hf('Comfy-Org/MiniMax-H3', 'text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors') },
    { folder: 'vae', file: 'minimax_h3_video_vae_fp16.safetensors', url: hf('Comfy-Org/MiniMax-H3', 'vae/minimax_h3_video_vae_fp16.safetensors') },
    { folder: 'vae', file: 'minimax_h3_audio_vae_fp32.safetensors', url: hf('Comfy-Org/MiniMax-H3', 'vae/minimax_h3_audio_vae_fp32.safetensors') },
  ] },
  { id: 'h3-ref', label: 'MiniMax H3 — multi-reference (adds to the set above)', files: [
    { folder: 'diffusion_models', file: 'minimax_h3_ref2va_pruned_int8_convrot.safetensors', url: hf('Comfy-Org/MiniMax-H3', 'diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors') },
  ] },
  { id: 'h3-turbo', label: 'MiniMax H3 Turbo LoRA (optional)', files: [
    { folder: 'loras', file: 'minimax_h3_turbo_v4_step600_ema_pruned_comfyui.safetensors', url: hf('drbaph/MiniMax-H3-Turbo-Lora-ComfyUI', 'minimax_h3_turbo_v4_step600_ema_pruned_comfyui.safetensors') },
  ] },
  { id: 'upscale', label: '4x-UltraSharp (Upscale node)', files: [
    { folder: 'upscale_models', file: '4x-UltraSharp.pth', url: hf('lokCX/4x-Ultrasharp', '4x-UltraSharp.pth') },
  ] },
];
