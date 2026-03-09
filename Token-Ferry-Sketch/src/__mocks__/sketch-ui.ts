// Mock for sketch/ui module
const UI = {
  message(text: string) {
    console.log('[sketch/ui]', text);
  },
  alert(title: string, message: string) {
    console.log('[sketch/ui alert]', title, message);
  },
};

export default UI;
