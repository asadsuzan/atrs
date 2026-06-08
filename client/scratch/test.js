const text = `
Demos  
[
    {
      icon: "",
      title: "Default",
      type: "iframe",
      url: "https://bblockswp.com/demo/offcanvas-block-default/",
    },
    {
      icon: "",
      title: "Diffrent Direction",
      description: "",
      category: "",
      type: "iframe",
      url: "https://bblockswp.com/demo/offcanvas-block-different-directions/",
    },
  ]

Top 5 star ratings link: [

]
`;

const jsonMatch = text.match(/Demos\s*(\[\s*\{[\s\S]*?\}\s*,?\s*\])/i);
console.log(jsonMatch ? jsonMatch[1] : "No match");

if (jsonMatch) {
    try {
        const parsedArray = new Function(`return ${jsonMatch[1]}`)();
        console.log("Parsed:", parsedArray);
    } catch (e) {
        console.log("Error:", e);
    }
}
