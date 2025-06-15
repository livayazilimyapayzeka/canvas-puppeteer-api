const testPayload = {
  canvas_data: {
    background: '#f0f8ff',
    objects: [
      {
        type: 'text',
        text: 'Hello Vercel!',
        left: 100,
        top: 100,
        fontSize: 32,
        fill: '#333333',
        fontFamily: 'Arial'
      },
      {
        type: 'rect',
        left: 50,
        top: 200,
        width: 200,
        height: 100,
        fill: '#ff6b6b',
        rx: 10,
        ry: 10
      }
    ]
  },
  width: 400,
  height: 300,
  format: 'png',
  quality: 1,
  scale: 2
};

fetch('http://localhost:3000/api/render', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testPayload)
})
.then(res => res.json())
.then(data => {
  console.log('Success:', data.success);
  console.log('Processing time:', data.processing_time, 'ms');
  if (data.image_url) {
    console.log('Image URL length:', data.image_url.length);
  }
})
.catch(err => console.error('Error:', err));
