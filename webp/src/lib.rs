use image_webp::WebPEncoder;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn encode(input: &[u8], width: u32, height: u32) -> Result<Box<[u8]>, String> {
    let mut w = Vec::new();
    WebPEncoder::new(&mut w)
        .encode(input, width, height, image_webp::ColorType::Rgba8)
        .map_err(|e| format!("Failed to encode: {:?}", e))?;
    Ok(w.into_boxed_slice())
}
