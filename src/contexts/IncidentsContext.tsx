import React, { createContext, useContext, useReducer } from 'react';
import { Incident } from '../lib/supabase';

type State = Incident[];
type Action = 
  | { type: 'SET_INCIDENTS'; payload: Incident[] }
  | { type: 'ADD_INCIDENT'; payload: Incident }
  | { type: 'UPDATE_INCIDENT'; payload: Incident }
  | { type: 'REMOVE_INCIDENT'; payload: string };

const IncidentsContext = createContext<{
  incidents: Incident[];
  dispatch: React.Dispatch<Action>;
  addIncident: (incident: Incident) => void;
  updateIncident: (incident: Incident) => void;
  removeIncident: (id: string) => void;
} | undefined>(undefined);

const incidentsReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_INCIDENTS': 
      return action.payload;
    case 'ADD_INCIDENT': 
      return [action.payload, ...state];
    case 'UPDATE_INCIDENT': 
      return state.map(i => i.id === action.payload.id ? action.payload : i);
    case 'REMOVE_INCIDENT': 
      return state.filter(i => i.id !== action.payload);
    default: 
      return state;
  }
};

export const IncidentsProvider = ({ children }: { children: React.ReactNode }) => {
  const [incidents, dispatch] = useReducer(incidentsReducer, []);

  const addIncident = (incident: Incident) => {
    dispatch({ type: 'ADD_INCIDENT', payload: incident });
  };

  const updateIncident = (incident: Incident) => {
    dispatch({ type: 'UPDATE_INCIDENT', payload: incident });
  };

  const removeIncident = (id: string) => {
    dispatch({ type: 'REMOVE_INCIDENT', payload: id });
  };

  return (
    <IncidentsContext.Provider value={{ 
      incidents, 
      dispatch, 
      addIncident, 
      updateIncident, 
      removeIncident 
    }}>
      {children}
    </IncidentsContext.Provider>
  );
};

export const useIncidentsContext = () => {
  const context = useContext(IncidentsContext);
  if (!context) {
    throw new Error('useIncidentsContext must be used within IncidentsProvider');
  }
  return context;
};