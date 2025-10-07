import { useState } from "react";
import BackgroundSurface from "../Components/BackgroundSurface";
import SpaceBackground from "../Components/SpaceBackground";
import { useTranslation } from "react-i18next";
import { useGlobalBackground } from "../contexts/GlobalBackgroundContext";

interface TeamMember {
  id: number;
  name: string;
  firstName: string;
  photo: string;
  descriptionKey: string;
  links: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
  };
}

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Benelgorch",
    firstName: "Thomas",
    photo: "/img/Thomas Benelgorch-1.png",
    descriptionKey: "thomas",
    links: {
      github: "https://github.com/thomas-benelgorch",
      linkedin: "https://linkedin.com/in/thomas-benelgorch"
    }
  },
  {
    id: 2,
    name: "Safi",
    firstName: "Bilal",
    photo: "/img/Bilal Safi-1.png",
    descriptionKey: "bilal",
    links: {
      github: "https://github.com/bilal-safi",
      linkedin: "https://linkedin.com/in/bilal-safi"
    }
  },
  {
    id: 3,
    name: "Ravaonoromanana",
    firstName: "Dylan",
    photo: "/img/Dylan Ravaonoromanana-1.png",
    descriptionKey: "dylan",
    links: {
      github: "https://github.com/dylan-ravaonoromanana",
      linkedin: "https://linkedin.com/in/dylan-ravaonoromanana"
    }
  },
  {
    id: 4,
    name: "Bislimi",
    firstName: "Dren",
    photo: "/img/Dren Bislimi-1.png",
    descriptionKey: "dren",
    links: {
      github: "https://github.com/dren-bislimi",
      linkedin: "https://linkedin.com/in/dren-bislimi"
    }
  }
];

export default function About() {
  const { t } = useTranslation();
  const { currentBackground } = useGlobalBackground();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const isImageBackground = currentBackground.id !== 'default';

  const openPopup = (member: TeamMember) => {
    setSelectedMember(member);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setTimeout(() => setSelectedMember(null), 300);
  };

  return (
    <BackgroundSurface>
    <SpaceBackground />
    <div className="relative min-h-screen overflow-hidden">

      {/* Contenu principal */}
      <div className="relative z-10 min-h-screen py-20">
        <div className="max-w-6xl mx-auto px-6">
          
          {/* Titre de la page */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 mb-6">
              {t('about.title') || 'Notre Équipe'}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 font-light max-w-3xl mx-auto">
              {t('about.subtitle') || 'Découvrez les talents derrière Transcendence'}
            </p>
          </div>

          {/* Grille des membres de l'équipe */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="group cursor-pointer"
                onClick={() => openPopup(member)}
              >
                {/* Carte du membre */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-purple-900/50 backdrop-blur-sm border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                  
                  {/* Photo du membre */}
                  <div className="relative h-64 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                    <img
                      src={member.photo}
                      alt={`${member.firstName} ${member.name}`}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  
                  {/* Informations du membre */}
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {member.firstName} {member.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {t('about.role') || 'Développeur Full-Stack'}
                    </p>
                  </div>
                  
                  {/* Effet de lueur au survol */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-red-500/0 group-hover:from-orange-500/10 group-hover:to-red-500/10 transition-all duration-300 rounded-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pop-up du membre sélectionné */}
      {isPopupOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closePopup}
          ></div>
          
          {/* Pop-up */}
          <div className={`relative bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl border border-purple-500/30 max-w-2xl w-full transform transition-all duration-300 ${isPopupOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            
            {/* En-tête du pop-up */}
            <div className="relative p-8">
              {/* Bouton fermer */}
              <button
                onClick={closePopup}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
                             {/* Photo et nom */}
               <div className="flex items-center space-x-6 mb-6">
                 <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/50">
                   <img
                     src={selectedMember.photo}
                     alt={`${selectedMember.firstName} ${selectedMember.name}`}
                     className="w-full h-full object-cover object-center"
                   />
                 </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {selectedMember.firstName} {selectedMember.name}
                  </h2>
                  <p className="text-gray-300">{t('about.role') || 'Développeur Full-Stack'}</p>
                </div>
              </div>
              
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-3">{t('about.pathway') || 'Parcours'}</h3>
                <p className="text-gray-300 leading-relaxed">
                  {t(`about.descriptions.${selectedMember.descriptionKey}`) || 'Description non disponible'}
                </p>
              </div>
              
              {/* Liens */}
              <div className="flex space-x-4">
                {selectedMember.links.github && (
                  <a
                    href={selectedMember.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors duration-200 text-white hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>{t('about.github') || 'GitHub'}</span>
                  </a>
                )}
                
                {selectedMember.links.linkedin && (
                  <a
                    href={selectedMember.links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600/50 hover:bg-blue-500/50 rounded-lg transition-colors duration-200 text-white hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span>{t('about.linkedin') || 'LinkedIn'}</span>
                  </a>
                )}
                
                {selectedMember.links.portfolio && (
                  <a
                    href={selectedMember.links.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600/50 hover:bg-purple-500/50 rounded-lg transition-colors duration-200 text-white hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>{t('about.portfolio') || 'Portfolio'}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </BackgroundSurface>
  );
}
