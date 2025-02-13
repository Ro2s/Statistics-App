// script.js
const { createApp, ref, computed } = Vue

createApp({
    setup() {
        // État pour la gestion des groupes
        const groups = ref([])
        const newGroupName = ref('')
        const selectedGroup = ref('')
        const showStatBuilder = ref(false)
        const fileInput = ref(null);

        // État existant pour les personnes
        const newName = ref('')
        const people = ref([])
        const statistics = ref(null)
        const selectedPerson = ref('')
        const newExtraMemberName = ref('')
        const newExtraMemberType = ref('invited')
        const extraMembers = ref([])
        const selectedDate = ref('')
        const generatedText = ref('')
        
        const hasExtraMembers = computed(() => extraMembers.value.length > 0)

        const invitedMembers = computed(() => 
            extraMembers.value.filter(member => member.type === 'invited')
        )
        
        const sympathizerMembers = computed(() => 
            extraMembers.value.filter(member => member.type === 'sympathizer')
        )
        
         // Fonction pour détecter iOS
         const isIOS = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const iOSDevices = ['iphone', 'ipad', 'ipod'];
            return iOSDevices.some(device => userAgent.includes(device)) || 
                   (userAgent.includes('mac') && 'ontouchend' in document);
        };

        // Fonction pour créer un lien de téléchargement compatible iOS
        const createDownloadLink = (data, filename) => {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            if (isIOS()) {
                // Solution pour iOS
                const reader = new FileReader();
                reader.onload = function(e) {
                    const textArea = document.createElement('textarea');
                    textArea.value = data;
                    document.body.appendChild(textArea);
                    textArea.select();
                    textArea.setSelectionRange(0, 99999); // Pour les mobiles
                    
                    try {
                        document.execCommand('copy');
                        alert('Les données ont été copiées dans le presse-papiers. Vous pouvez les coller et les sauvegarder dans une note ou les envoyer par message.');
                    } catch (err) {
                        console.error('Erreur lors de la copie:', err);
                        alert('Impossible de copier les données. ' + err.message);
                    }
                    
                    document.body.removeChild(textArea);
                    URL.revokeObjectURL(url);
                };
                reader.readAsText(blob);
            } else {
                // Solution pour desktop et autres mobiles
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        };
        
        // Add selectGroup function
        const selectGroup = (groupName) => {
            selectedGroup.value = groupName
            const group = groups.value.find(g => g.name === groupName)
            if (group) {
                people.value = [...group.people]
                extraMembers.value = group.extraMembers || []
                showStatBuilder.value = true
                // Reset statistics and generated text when switching groups
                statistics.value = null
                generatedText.value = ''
                selectedDate.value = ''
            }
        }
        
        const smoothScroll = (targetY, duration) => {
            const startY = window.scrollY;
            const difference = targetY - startY;
            const startTime = performance.now();
        
            const step = () => {
                const progress = (performance.now() - startTime) / duration;
                
                if (progress < 1) {
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    window.scrollTo(0, startY + difference * easeProgress);
                    requestAnimationFrame(step);
                } else {
                    window.scrollTo(0, targetY);
                }
            };
        
            requestAnimationFrame(step);
        };
        
        const storage = {
            // Your existing storage code...
            isAvailable() {
                try {
                    const test = '__test__';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch (e) {
                    console.warn('LocalStorage non disponible:', e);
                    return false;
                }
            },
            
            save(key, data) {
                if (!this.isAvailable()) {
                    console.warn('Impossible de sauvegarder les données - LocalStorage non disponible');
                    return false;
                }
        
                try {
                    const serializedData = JSON.stringify(data);
                    localStorage.setItem(key, serializedData);
                    return true;
                } catch (e) {
                    if (e.name === 'QuotaExceededError' || 
                        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
                        e.code === 22) {
                        console.warn('Espace de stockage plein - Nettoyage et nouvel essai');
                        this.cleanup();
                        try {
                            const serializedData = JSON.stringify(data);
                            localStorage.setItem(key, serializedData);
                            return true;
                        } catch (retryError) {
                            console.error('Échec de la sauvegarde même après nettoyage:', retryError);
                            return false;
                        }
                    }
                    console.error('Erreur lors de la sauvegarde:', e);
                    return false;
                }
            },
            
            load(key, defaultValue = null) {
                if (!this.isAvailable()) {
                    console.warn('Impossible de charger les données - LocalStorage non disponible');
                    return defaultValue;
                }
        
                try {
                    const serializedData = localStorage.getItem(key);
                    if (serializedData === null) {
                        return defaultValue;
                    }
                    return JSON.parse(serializedData);
                } catch (e) {
                    console.error('Erreur lors du chargement:', e);
                    return defaultValue;
                }
            },
            
            cleanup() {
                try {
                    const keysToKeep = ['groups'];
                    Object.keys(localStorage).forEach(key => {
                        if (!keysToKeep.includes(key)) {
                            localStorage.removeItem(key);
                        }
                    });
                } catch (e) {
                    console.error('Erreur lors du nettoyage:', e);
                }
            }
        };

        // Initialisation from storage function
        function initializeFromStorage() {
            const savedGroups = storage.load('groups', []);
            groups.value = savedGroups;
        }
        
        // Initialize data from localStorage on component mount
        initializeFromStorage()
        
        // Gestion des groupes
        const addGroup = () => {
            if (newGroupName.value.trim() === '') {
                alert("Le nom du groupe ne peut pas être vide.");
                return;
            }
            if (groups.value.some(group => group.name === newGroupName.value)) {
                alert("Ce nom de groupe existe déjà.");
                return;
            }
            groups.value.push({
                name: newGroupName.value,
                people: []
            });
            
            if (!storage.save('groups', groups.value)) {
                alert("Attention: Impossible de sauvegarder le groupe. L'application continuera de fonctionner mais les données pourraient être perdues lors du rechargement de la page.");
            }
            newGroupName.value = '';
        };

        const removeGroup = (groupName) => {
            if (confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${groupName}" ?`)) {
                groups.value = groups.value.filter(group => group.name !== groupName);
                if (selectedGroup.value === groupName) {
                    selectedGroup.value = '';
                    showStatBuilder.value = false;
                }
                if (!storage.save('groups', groups.value)) {
                    alert("Attention: Impossible de sauvegarder la suppression. L'application continuera de fonctionner mais les données pourraient être perdues lors du rechargement de la page.");
                }
            }
        };
        
        
        const triggerFileInput = () => {
            // Créer un input de type file
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const importedGroup = JSON.parse(e.target.result);
                            importGroup(importedGroup);
                        } catch (error) {
                            alert('Erreur lors de la lecture du fichier. Vérifiez que le format est correct.');
                            console.error('Erreur de parsing:', error);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            
            // Déclencher le click sur l'input
            input.click();
        };

        // Nouvelle fonction de gestion de fichier
        const handleFileSelect = (event) => {
            const file = event.target.files[0];
            if (!file) {
                console.log('Aucun fichier sélectionné');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedGroup = JSON.parse(e.target.result);
                    importGroup(importedGroup);
                } catch (error) {
                    alert('Erreur lors de la lecture du fichier. Vérifiez que le format est correct.');
                    console.error('Erreur de parsing:', error);
                }
            };
            reader.readAsText(file);
        };
        
        const exportGroup = (groupName) => {
            const group = groups.value.find(g => g.name === groupName);
            if (!group) return;
        
            try {
                // Formater les données en JSON avec indentation pour meilleure lisibilité
                const dataStr = JSON.stringify(group, null, 2);
                
                // Créer un Blob avec les données
                const blob = new Blob([dataStr], { type: 'application/json' });
                
                // Créer une URL pour le blob
                const url = URL.createObjectURL(blob);
                
                // Créer un lien pour le téléchargement
                const a = document.createElement('a');
                a.href = url;
                a.download = `${groupName}_export.json`;
                
                // Ajouter le lien au document, cliquer dessus, puis le retirer
                document.body.appendChild(a);
                a.click();
                
                // Nettoyer
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 0);
                
            } catch (error) {
                console.error('Erreur lors de l\'export:', error);
                alert('Une erreur est survenue lors de l\'export du groupe.');
            }
        };
        
        const importGroup = async (groupData) => {
            try {
                if (!groupData.name || !Array.isArray(groupData.people)) {
                    throw new Error('Structure de données invalide');
                }
        
                // Vérifier si le groupe existe déjà
                const existingGroup = groups.value.find(g => g.name === groupData.name);
                if (existingGroup) {
                    if (!confirm(`Un groupe nommé "${groupData.name}" existe déjà. Voulez-vous le remplacer ?`)) {
                        return;
                    }
                    groups.value = groups.value.filter(g => g.name !== groupData.name);
                }
        
                // Ajouter le nouveau groupe
                groups.value.push(groupData);
                storage.save('groups', groups.value);
                alert('Groupe importé avec succès !');
                
            } catch (error) {
                console.error('Erreur lors de l\'import:', error);
                alert(`Erreur lors de l'importation: ${error.message}`);
            }
        };

        // Mise à jour des fonctions existantes pour la gestion des personnes
        const addPerson = () => {
            if (newName.value.trim() === '') {
                alert("Le nom ne peut pas être vide.")
                return
            }
            const currentGroup = groups.value.find(g => g.name === selectedGroup.value)
            if (currentGroup) {
                const newPerson = { name: newName.value, present: false, absent: false }
                people.value.push(newPerson)
                currentGroup.people = [...people.value]
                localStorage.setItem('groups', JSON.stringify(groups.value))
                newName.value = ''
            }
        }

        const removePerson = () => {
            if (selectedPerson.value) {
                const currentGroup = groups.value.find(g => g.name === selectedGroup.value)
                if (currentGroup) {
                    people.value = people.value.filter(person => person.name !== selectedPerson.value)
                    currentGroup.people = [...people.value]
                    localStorage.setItem('groups', JSON.stringify(groups.value))
                    selectedPerson.value = ''
                }
            }
        }

        const updateAbsent = (person) => {
            if (person.present) {
                person.absent = false
            }
            updateGroupData()
        }

        const updatePresent = (person) => {
            if (person.absent) {
                person.present = false
            }
            updateGroupData()
        }

        const updateGroupData = () => {
            const currentGroup = groups.value.find(g => g.name === selectedGroup.value);
            if (currentGroup) {
                currentGroup.people = [...people.value];
                if (!storage.save('groups', groups.value)) {
                    alert("Attention: Impossible de sauvegarder les modifications. L'application continuera de fonctionner mais les données pourraient être perdues lors du rechargement de la page.");
                }
            }
        };

        // Caractères spéciaux et emojis
        const specialChars = {
            sunriseEmoji: '\u{1F304}',
            tridentEmoji: '\u{1F531}',
            checkCircle: '\u{2B55}',
            crossMark: '\u{274C}',
            longDash: '\u{2015}',
            sparkles: '\u{2728}',
            calendar: '\u{1F4C5}',
            person: '\u{1F464}',
            clock: '\u{1F551}',
            chart: '\u{1F4C8}'
        }

        // Formatage et génération des statistiques
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            return date.toLocaleDateString('fr-FR', options).toUpperCase();
        }

        const generateSeparator = (length = 10) => {
            return Array(length).fill(specialChars.longDash).join('');
        }
        
        // Adding visitor
        
        const addExtraMember = () => {
            if (newExtraMemberName.value.trim() === '') {
                alert("Le nom ne peut pas être vide.")
                return
            }
            
            const exists = extraMembers.value.some(
                member => member.name.toLowerCase() === newExtraMemberName.value.toLowerCase()
            )
            
            if (exists) {
                alert("Cette personne est déjà dans la liste.")
                return
            }
            
            extraMembers.value.push({
                name: newExtraMemberName.value,
                type: newExtraMemberType.value
            })
            
            // Mise à jour du stockage
            const currentGroup = groups.value.find(g => g.name === selectedGroup.value)
            if (currentGroup) {
                currentGroup.extraMembers = extraMembers.value
                storage.save('groups', groups.value)
            }
            
            newExtraMemberName.value = ''
        }
        
        // Remove visitors
        
        const removeExtraMember = (member) => {
            extraMembers.value = extraMembers.value.filter(m => m.name !== member.name)
            
            // Mise à jour du stockage
            const currentGroup = groups.value.find(g => g.name === selectedGroup.value)
            if (currentGroup) {
                currentGroup.extraMembers = extraMembers.value
                storage.save('groups', groups.value)
            }
        }

        const generateStatistics = () => {
            const allChecked = people.value.every(person => person.present || person.absent);
        
            if (!allChecked) {
                alert("Veuillez cocher toutes les cases (présent ou absent) avant de générer les statistiques.");
                return;
            }
        
            const total = people.value.length;
            const present = people.value.filter(person => person.present).length;
            const absent = people.value.filter(person => person.absent).length;
            const presencePercentage = ((present / total) * 100).toFixed(2);
            
            statistics.value = { total, present, absent, presencePercentage };
            generatedText.value = generateText();
        
            // Attendre que Vue mette à jour le DOM
            Vue.nextTick(() => {
                const resultatsElement = document.getElementById('resultats');
                if (resultatsElement) {
                    const targetY = resultatsElement.getBoundingClientRect().top + window.scrollY - 20; // -20 pour un petit décalage
                    smoothScroll(targetY, 800); // 800ms de durée d'animation
                    
                    // Animation d'apparition des résultats
                    resultatsElement.style.opacity = '0';
                    resultatsElement.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        resultatsElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        resultatsElement.style.opacity = '1';
                        resultatsElement.style.transform = 'translateY(0)';
                    }, 100);
                }
            });
        };

        const generateText = () => {
            if (!selectedDate.value) {
                alert("Veuillez sélectionner une date valide.")
                return
            }
        
            const presentList = people.value
                .filter(person => person.present)
                .map(person => person.name)
            
            const absentList = people.value
                .filter(person => person.absent)
                .map(person => person.name)
        
            const formattedDate = formatDate(selectedDate.value)
            
            let text = [
                `*${selectedGroup.value}* ${specialChars.sunriseEmoji}`,
                `${specialChars.calendar} ${formattedDate}`,
                generateSeparator(20),
                '',
                `${specialChars.checkCircle} *Présences :* ${specialChars.sparkles}`,
                '',
                ...presentList.map((name, index) => `${index + 1}. ${name}`),
                '',
                `${specialChars.crossMark} *Absences :*`,
                '',
                ...absentList.map((name, index) => `${index + 1}. ${name}`)
            ]
        
            // Ajouter les invités s'il y en a
            if (invitedMembers.value.length > 0) {
                text = text.concat([
                    '',
                    `${specialChars.person} *Invités :*`,
                    '',
                    ...invitedMembers.value.map((member, index) => `${index + 1}. ${member.name}`)
                ])
            }
        
            // Ajouter les sympathisants s'il y en a
            if (sympathizerMembers.value.length > 0) {
                text = text.concat([
                    '',
                    `${specialChars.sparkles} *Sympathisants :*`,
                    '',
                    ...sympathizerMembers.value.map((member, index) => `${index + 1}. ${member.name}`)
                ])
            }
        
            text = text.concat([
                '',
                `${specialChars.chart} _Total de présence:_ *${statistics.value.presencePercentage}%*`
            ])
        
            return text.join('\n')
        }

        const sanitizeText = (text) => {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        const generatePDF = () => {
            const { jsPDF } = window.jspdf
            const doc = new jsPDF()
        
            doc.setFont("helvetica")
            doc.setLanguage("fr")
        
            const formattedDate = formatDate(selectedDate.value)
            
            doc.setFontSize(25)
            doc.text(`Statistiques ${selectedGroup.value}`, 10, 20)
            doc.setFontSize(16)
            doc.text(formattedDate, 10, 30)
            
            // Tableau des présences
            const tableData = people.value.map(person => [
                sanitizeText(person.name),
                person.present ? 'Présent' : 'Absent'
            ])
        
            doc.autoTable({
                startY: 40,
                head: [['Nom', 'Statut']],
                body: tableData,
                styles: { font: "helvetica", fontSize: 12 }
            })
        
            let currentY = doc.lastAutoTable.finalY + 20
        
            // Ajouter le tableau des invités et sympathisants s'il y en a
            if (hasExtraMembers.value) {
                doc.setFontSize(18)
                doc.text("Invités et Sympathisants", 10, currentY)
                
                const extraMembersData = extraMembers.value.map(member => [
                    sanitizeText(member.name),
                    member.type === 'invited' ? 'Invité' : 'Sympathisant'
                ])
        
                doc.autoTable({
                    startY: currentY + 10,
                    head: [['Nom', 'Type']],
                    body: extraMembersData,
                    styles: { font: "helvetica", fontSize: 12 }
                })
        
                currentY = doc.lastAutoTable.finalY + 20
            }
        
            // Statistiques globales
            doc.setFontSize(18)
            doc.text("Statistiques globales", 10, currentY)
            doc.setFontSize(12)
            doc.text([
                `Présents: ${statistics.value.present}`,
                `Absents: ${statistics.value.absent}`,
                `Total: ${statistics.value.total}`,
                `Taux de présence: ${statistics.value.presencePercentage}%`
            ], 10, currentY + 10)
            
            const fileName = `Statistiques_${selectedGroup.value.replace(/ /g, '_')}_${selectedDate.value.replace(/-/g, '_')}.pdf`
            doc.save(fileName)
        }

        return {
            // Group management
            groups,
            newGroupName,
            selectedGroup,
            showStatBuilder,
            addGroup,
            removeGroup,
            selectGroup, // Add selectGroup to returned object
            exportGroup,
            importGroup,
            fileInput,
            triggerFileInput,
            importGroup,

            // Existing functionality
            newName,
            people,
            statistics,
            selectedPerson,
            selectedDate,
            generatedText,
            addPerson,
            removePerson,
            updateAbsent,
            updatePresent,
            newExtraMemberName,
            newExtraMemberType,
            extraMembers,
            hasExtraMembers,
            invitedMembers,
            sympathizerMembers,
            addExtraMember,
            removeExtraMember,
            generateStatistics,
            generatePDF
        }
    }
}).mount('#app')
