import { useState } from 'react';
import { useNavigate } from "react-router-dom";

export default function reglages{
    
    try{
        const response = await fetch('http://localhost:3000/reglages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId}),
        });
    }   
}