const prompts = [
  "In this screenshot, identify the coding question and respond as follows: 1) First, provide the direct solution code with proper formatting (use appropriate line breaks and indentation for the specific language). For SQL, put clauses on separate lines. For Python, follow PEP 8. For JavaScript, use standard formatting. 2) Then provide a STEP-BY-STEP explanation with SHORT, numbered points that an interviewee could easily follow when speaking.",
  
  "For this coding problem: 1) First provide properly formatted code (with proper indentation and line breaks appropriate for the language). For SQL queries, put each clause on a new line. For array/object definitions in any language, format them clearly. 2) Then give a numbered, step-by-step explanation with each step as a brief, scannable point - as if preparing someone to explain their solution in an interview setting.",
  
  "ANSWER: [Provide correctly formatted solution code according to language conventions - use proper indentation, line breaks, and spacing] EXPLANATION: [Number each step of your explanation as Step 1, Step 2, etc. Keep each step very brief and focused on ONE concept, like interview talking points]",
  
  "For this screenshot: 1) First write the solution with proper code formatting specific to the language (SQL clauses on separate lines, Python with 4-space indents, JavaScript with proper breaks, etc). 2) Then explain using numbered steps where each step is a single, brief point that could be quickly referenced during an interview explanation.",
  
  "From this image, first provide the solution code with professional formatting following best practices for the specific language. Then explain your approach as numbered, bite-sized steps that someone could easily glance at while explaining their solution to an interviewer. Keep each step to a single concept.",
  
  "SOLUTION: [Give properly formatted code with appropriate line breaks and indentation for the specific language. SQL clauses should be on separate lines. Arrays and nested structures should be properly formatted.] WALKTHROUGH: [Number your points as Step 1, Step 2, etc., keeping each step extremely brief - one clear concept per point that could be quickly referenced during an interview]",
  
  "For this coding challenge: 1) First provide the properly formatted solution according to language conventions (Python per PEP 8, JavaScript with proper breaks, SQL with clauses on new lines, etc). 2) Then explain your solution as a series of very short, numbered points - each conveying just one idea that could be quickly referenced when explaining your approach in an interview.",
  
  "From this screenshot: 1) Provide the solution with professional code formatting specific to the language in question. 2) Then explain your approach in a numbered list where each point is extremely concise - just enough to help someone explain their thinking step by step in an interview without having to read long explanations.",
  
  "Looking at this problem: 1) First write a properly formatted solution according to the language's best practices (SQL: clauses on separate lines; Python: PEP 8 compliant; JavaScript: standard format). 2) Then provide a step-by-step explanation with each step numbered and kept extremely brief - formatted as quick reference points that someone could glance at while explaining their solution in an interview.",
  
  "ANSWER: [Provide a correctly formatted solution with proper indentation and line breaks according to the language's conventions] EXPLANATION: [Number each step of your explanation (Step 1, Step 2...) and keep each step extremely concise - just 1-2 sentences that could be quickly referenced during an interview explanation]"
];

function getRandomPrompt() {
  const randomIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomIndex];
}

module.exports = {
  getRandomPrompt
};