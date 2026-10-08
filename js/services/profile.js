window.createUserProfile = async function(userId, profileData) {
  try {
    const { data, error } = await supabaseClient
      .from('profile')
      .insert([
        {
          id: userId,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          updated_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error al guardar en profile:', err);
    return { data: null, error: err };
  }
};

window.getUserProfile = async function(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error al obtener perfil:', err);
    return { data: null, error: err };
  }
}; 