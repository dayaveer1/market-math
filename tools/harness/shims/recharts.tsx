import { createElement } from 'react';
const Box = ({ children }: any) => createElement('div', { 'data-chart': true }, children);
export const ResponsiveContainer = Box, LineChart = Box, BarChart = Box;
export const Line = () => null, Bar = () => null, XAxis = () => null, YAxis = () => null, Tooltip = () => null, CartesianGrid = () => null;
